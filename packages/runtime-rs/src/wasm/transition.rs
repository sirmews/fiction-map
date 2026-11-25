use super::{JsResult, get, record, set, spread};
use crate::js_state::{clone_state, navigate_to_node};
use js_sys::{Array, Function, Map, Reflect};
use wasm_bindgen::{JsCast, prelude::*};

const HIDDEN: &str = "Transition is not visible";
const BLOCKED: &str = "Requirements not met";

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console, js_name = warn, catch)]
    fn warn(message: &str) -> Result<(), JsValue>;
}

// The host caches only the identities of functions created by this Wasm
// binding. The registry itself stays live and is read for every invocation.
#[wasm_bindgen(inline_js = "
const evaluators = new WeakMap(), handlers = new WeakMap();
export function remember(callback, kind, condition) {
    (condition ? evaluators : handlers).set(callback, kind);
}
export function lookup(registry, key, condition) {
    const callback = registry.get(key);
    if (typeof callback === 'function') {
        return (condition ? evaluators : handlers).get(callback) ?? callback;
    }
    if (callback) throw new TypeError('Registered callback is not a function');
    return callback;
}
export function invoke(callback,state,item,context){return callback(state,item,context)}
export function* matchingItems(rows, field, object, key, snapshotLength) {
    if (snapshotLength) {
        const length = rows.length;
        for (let i = 0; i < length; ++i) {
            if (i in rows) {
                const row = rows[i];
                if (row[field] === object[key]) yield row;
            }
        }
    } else {
        for (const row of rows) if (row[field] === object[key]) yield row;
    }
}
")]
extern "C" {
    #[wasm_bindgen(catch)]
    fn invoke(
        callback: &JsValue,
        state: &JsValue,
        item: &JsValue,
        context: &JsValue,
    ) -> Result<JsValue, JsValue>;
    fn remember(callback: &Function, kind: &str, condition: bool);
    #[wasm_bindgen(catch)]
    fn lookup(registry: &Map, key: &JsValue, condition: bool) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(js_name=matchingItems,catch)]
    fn matching_items(
        rows: &Array,
        field: &str,
        object: &JsValue,
        key: &str,
        snapshot_length: bool,
    ) -> Result<JsValue, JsValue>;
}

#[wasm_bindgen(js_name=registerBuiltinIdentity)]
pub fn register_builtin_identity(callback: &Function, kind: &str, condition: bool) {
    remember(callback, kind, condition);
}

fn registered(
    state: &JsValue,
    item: &JsValue,
    registry: &Map,
    context: &JsValue,
    condition: bool,
    warn_missing: bool,
) -> JsResult {
    let name = get(item, "type")?;
    let callback = lookup(registry, &name, condition)?;
    if let Some(kind) = callback.as_string().filter(|kind| !kind.is_empty()) {
        return if condition {
            Ok(super::builtins::evaluate_condition(&kind, state, item, context)?.into())
        } else {
            super::builtins::apply_effect(&kind, state, item)
        };
    }
    if callback.is_falsy() {
        if warn_missing {
            let kind = if condition {
                "evaluator registered for condition"
            } else {
                "handler registered for effect"
            };
            warn(&format!(
                "No {kind} type: {}",
                name.as_string().unwrap_or_default()
            ))?;
        } else if condition && !callback.is_null() && !callback.is_undefined() {
            return Err(js_sys::TypeError::new("Registered callback is not a function").into());
        }
        return Ok(if condition {
            JsValue::FALSE
        } else {
            state.clone()
        });
    }
    invoke(&callback, state, item, context)
}

pub(crate) fn evaluate_trigger_condition(
    state: &JsValue,
    item: &JsValue,
    registry: &Map,
    context: &JsValue,
) -> JsResult {
    registered(state, item, registry, context, true, false)
}
pub(crate) fn apply_trigger_effect(
    state: &JsValue,
    item: &JsValue,
    registry: &Map,
    context: &JsValue,
) -> JsResult {
    registered(state, item, registry, context, false, false)
}

#[wasm_bindgen(js_name = evaluateRegisteredCondition)]
pub fn evaluate_registered_condition(
    state: &JsValue,
    condition: &JsValue,
    registry: &Map,
    context: &JsValue,
) -> JsResult {
    registered(state, condition, registry, context, true, true)
}

#[wasm_bindgen(js_name = applyRegisteredEffect)]
pub fn apply_registered_effect(
    state: &JsValue,
    effect: &JsValue,
    registry: &Map,
    context: &JsValue,
) -> JsResult {
    registered(state, effect, registry, context, false, true)
}

struct Evaluation {
    trace: JsValue,
    context: JsValue,
}

impl Evaluation {
    fn new(context: &JsValue) -> Result<Self, JsValue> {
        let trace = record(&[
            ("conditionsEvaluated", &Array::new()),
            ("effectsApplied", &Array::new()),
        ])?;
        let context = spread(context)?;
        set(&context, "trace", &trace)?;
        Ok(Self { trace, context })
    }

    fn failures(
        &self,
        state: &JsValue,
        transition: &JsValue,
        registry: &Map,
        scope: &str,
    ) -> Result<Array, JsValue> {
        let failed = Array::new();
        let conditions = get(transition, scope)?;
        if !conditions.is_truthy() {
            return Ok(failed);
        }
        // Read the three groups before a callback can replace them.
        let groups = [
            get(&conditions, "all")?,
            get(&conditions, "any")?,
            get(&conditions, "none")?,
        ];
        for (group, values) in ["all", "any", "none"].into_iter().zip(groups) {
            if values.is_null() || values.is_undefined() {
                continue;
            }
            let values: Array = values.unchecked_into();
            if group == "any" {
                // Array.map visits the original length but observes deletion of future entries.
                let pending = Array::new();
                let mut passed = false;
                for i in 0..values.length() {
                    if Reflect::has(&values, &i.into())? {
                        let condition = Reflect::get_u32(&values, i)?;
                        passed |= evaluate_registered_condition(
                            state,
                            &condition,
                            registry,
                            &self.context,
                        )?
                        .is_truthy();
                        pending.push(&condition);
                    }
                }
                if !passed {
                    for condition in pending.iter() {
                        failed.push(&failure(scope, group, &condition)?);
                    }
                }
            } else {
                for condition in live_iter(&values)? {
                    let condition = condition?;
                    let passed =
                        evaluate_registered_condition(state, &condition, registry, &self.context)?
                            .is_truthy();
                    if passed == (group == "none") {
                        failed.push(&failure(scope, group, &condition)?);
                    }
                }
            }
        }
        Ok(failed)
    }
}

fn live_iter(value: &Array) -> Result<js_sys::IntoIter<JsValue>, JsValue> {
    js_sys::try_iter(value)?
        .ok_or_else(|| js_sys::TypeError::new("Expected an iterable array").into())
}

fn failure(scope: &str, group: &str, condition: &JsValue) -> JsResult {
    record(&[
        ("scope", &scope.into()),
        ("group", &group.into()),
        ("condition", condition),
    ])
}

#[wasm_bindgen(js_name = checkTransitionAvailability)]
pub fn check_transition_availability(
    state: &JsValue,
    transition: &JsValue,
    registry: &Map,
    context: &JsValue,
) -> JsResult {
    let evaluation = Evaluation::new(context)?;
    for (scope, visible, reason) in [
        ("visibility", false, HIDDEN),
        ("requirements", true, BLOCKED),
    ] {
        let failed = evaluation.failures(state, transition, registry, scope)?;
        if failed.length() > 0 {
            return record(&[
                ("allowed", &JsValue::FALSE),
                ("visible", &visible.into()),
                ("reason", &reason.into()),
                ("failedConditions", &failed),
            ]);
        }
    }
    record(&[("allowed", &JsValue::TRUE), ("visible", &JsValue::TRUE)])
}

#[wasm_bindgen(js_name = applyTransition)]
pub fn apply_transition(
    state: &JsValue,
    transition: &JsValue,
    evaluators: &Map,
    handlers: &Map,
    context: &JsValue,
) -> JsResult {
    let evaluation = Evaluation::new(context)?;
    let failed = evaluation.failures(state, transition, evaluators, "visibility")?;
    if failed.length() > 0 {
        return record(&[
            ("state", state),
            ("shouldNavigate", &JsValue::FALSE),
            ("success", &JsValue::FALSE),
            ("failureReason", &HIDDEN.into()),
            ("failedConditions", &failed),
            ("trace", &evaluation.trace),
        ]);
    }

    let failed = evaluation.failures(state, transition, evaluators, "requirements")?;
    let success = failed.length() == 0;
    let (effects_key, target_key) = if success {
        ("effects", "targetNodeId")
    } else {
        ("failureEffects", "failureTargetNodeId")
    };
    let effects = get(transition, effects_key)?;
    let target = get(transition, target_key)?;
    let mut next = clone_state(state)?;
    let mut consequence = JsValue::UNDEFINED;
    if effects.is_truthy() {
        let effects: Array = effects.unchecked_into();
        if effects.length() > 0 {
            next = apply_registered_effects(&next, &effects, handlers, &evaluation.context)?;
            for effect in live_iter(&effects)? {
                let effect = effect?;
                let applied: Array = get(&evaluation.trace, "effectsApplied")?.unchecked_into();
                applied.push(&record(&[
                    ("effect", &effect),
                    ("handler", &get(&effect, "type")?),
                ])?);
            }
            consequence = if effects.length() == 1 {
                spread(&effects.get(0))?
            } else {
                record(&[
                    ("type", &"multi".into()),
                    ("count", &effects.length().into()),
                ])?
            };
        }
    }

    if target.is_truthy() {
        next = navigate_to_node(&next, &target)?;
    }
    let (reason, failures) = if success {
        (JsValue::UNDEFINED, JsValue::UNDEFINED)
    } else {
        (BLOCKED.into(), failed.into())
    };
    record(&[
        ("state", &next),
        ("consequence", &consequence),
        ("shouldNavigate", &(!target.is_undefined()).into()),
        ("nextNodeId", &target),
        ("success", &success.into()),
        ("failureReason", &reason),
        ("failedConditions", &failures),
        ("trace", &evaluation.trace),
    ])
}

#[wasm_bindgen(js_name = groupTransitions)]
pub fn group_transitions(
    state: &JsValue,
    transitions: &Array,
    registry: &Map,
    context: &JsValue,
    available_only: bool,
) -> JsResult {
    let available = Array::new();
    let hidden = Array::new();
    let blocked = Array::new();
    // The iterator scans live JS rows in the host and yields once per match.
    // Rust evaluates each match before the host reads the next source, so
    // callbacks can mutate future transitions or change the current node.
    let candidates = matching_items(
        transitions,
        "sourceNodeId",
        state,
        "currentNodeId",
        available_only,
    )?;
    for transition in crate::js_util::items(&candidates)? {
        let transition = transition?;
        let status = check_transition_availability(state, &transition, registry, context)?;
        let group = if get(&status, "visible")?.is_falsy() {
            &hidden
        } else if get(&status, "allowed")?.is_falsy() {
            &blocked
        } else {
            &available
        };
        group.push(&transition);
    }
    if available_only {
        Ok(available.into())
    } else {
        record(&[
            ("available", &available),
            ("blocked", &blocked),
            ("hidden", &hidden),
        ])
    }
}

/// The standalone predicate short-circuits. Transition diagnostics evaluate
/// every condition in a group so that each failed requirement can be reported.
#[wasm_bindgen(js_name = evaluateConditionSet)]
pub fn evaluate_condition_set(
    state: &JsValue,
    conditions: &JsValue,
    registry: &Map,
    context: &JsValue,
) -> Result<bool, JsValue> {
    if conditions.is_falsy() {
        return Ok(true);
    }
    let groups = [
        get(conditions, "all")?,
        get(conditions, "any")?,
        get(conditions, "none")?,
    ];
    for (group, values) in ["all", "any", "none"].into_iter().zip(groups) {
        if values.is_null() || values.is_undefined() {
            continue;
        }
        let values: &Array = values.unchecked_ref();
        let length = values.length();
        if length == 0 {
            continue;
        }
        let mut passed = false;
        for index in 0..length {
            if !Reflect::has(values, &index.into())? {
                continue;
            }
            let condition = Reflect::get_u32(values, index)?;
            let result =
                evaluate_registered_condition(state, &condition, registry, context)?.is_truthy();
            match (group, result) {
                ("any", true) => {
                    passed = true;
                    break;
                }
                ("all", false) | ("none", true) => return Ok(false),
                _ => {}
            }
        }
        if group == "any" && !passed {
            return Ok(false);
        }
    }
    Ok(true)
}

#[wasm_bindgen(js_name = applyRegisteredEffects)]
pub fn apply_registered_effects(
    state: &JsValue,
    effects: &JsValue,
    registry: &Map,
    context: &JsValue,
) -> JsResult {
    if effects.is_falsy() {
        return Ok(state.clone());
    }
    let effects: &Array = effects.unchecked_ref();
    let mut next = state.clone();
    for index in 0..effects.length() {
        if Reflect::has(effects, &index.into())? {
            next = apply_registered_effect(
                &next,
                &Reflect::get_u32(effects, index)?,
                registry,
                context,
            )?;
        }
    }
    Ok(next)
}
