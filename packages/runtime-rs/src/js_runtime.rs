use std::collections::HashSet;

use js_sys::{Array, Function, Map, Set};
use wasm_bindgen::prelude::*;

use crate::js_fingerprint::{fingerprint, visited_condition_nodes};
use crate::js_state::clone_state;
use crate::js_util::{array, call, host_text, items, method, nullish, text};
use crate::traversal::{
    AUTOMATIC_LOOP_CODE, PathEnding, PathHost, automatic_loop_message, enumerate, finish_transition,
};
use crate::wasm::transition::{
    apply_registered_effect, apply_transition, apply_trigger_effect, evaluate_trigger_condition,
};
use crate::wasm::{JsResult, get, record, set, spread};

// One boundary crossing replaces spread + derivedState read + write. Each
// call still returns a fresh object, preserving per-iteration identity.
#[wasm_bindgen(inline_js = "export function traceContext(context) { const c = {...context}; c.derivedState = context.derivedState; return c; }")]
extern "C" {
    #[wasm_bindgen(catch, js_name = traceContext)]
    fn trace_context(context: &JsValue) -> Result<JsValue, JsValue>;
}

#[wasm_bindgen(js_name = runtimeStep)]
pub fn step(
    runtime: &JsValue,
    state: &JsValue,
    transition: &JsValue,
    evaluators: &Map,
    handlers: &Map,
    context: &JsValue,
    make_error: &Function,
) -> JsResult {
    let result = apply_transition(state, transition, evaluators, handlers, context)?;
    let state = get(&result, "state")?;
    if !get(&result, "success")?.is_truthy() || !state.is_truthy() {
        return Ok(result);
    }

    let fired = Set::new(&JsValue::UNDEFINED);
    // Loop-invariant host reads are taken once per step instead of once per
    // trigger pass or automatic transition. The triggers array and nodes map
    // keep their live JS identity, so iteration and Map.get still observe
    // mutations to their contents.
    let triggers = get(runtime, "triggers")?;
    let mut nodes = None;
    let state = finish_transition(
        state,
        |state| {
            let trace_context = if context.is_truthy() {
                trace_context(context)?
            } else {
                JsValue::UNDEFINED
            };
            for trigger in items(&triggers)? {
                let trigger = trigger?;
                let id = get(&trigger, "id")?;
                if fired.has(&id) {
                    continue;
                }
                let mut passed = true;
                for condition in items(&get(&trigger, "conditions")?)? {
                    let condition = condition?;
                    if !evaluate_trigger_condition(state, &condition, evaluators, &trace_context)?
                        .is_truthy()
                    {
                        passed = false;
                        break;
                    }
                }
                if !passed {
                    continue;
                }
                fired.add(&id);
                for effect in items(&get(&trigger, "effects")?)? {
                    *state = apply_trigger_effect(state, &effect?, handlers, &trace_context)?;
                }
                return Ok(true);
            }
            Ok(false)
        },
        |state, at_limit| {
            let node_id = get(state, "currentNodeId")?;
            if nodes.is_none() {
                nodes = Some(get(runtime, "nodes")?);
            }
            let node = method(
                nodes.as_ref().unwrap(),
                "get",
                std::slice::from_ref(&node_id),
            )?;
            if nullish(&node) || !get(&node, "autoResolve")?.is_truthy() {
                return Ok(false);
            }
            if at_limit {
                return Err(make_error.call2(
                    &JsValue::UNDEFINED,
                    &host_text(&automatic_loop_message(&text(&node_id)?)),
                    &JsValue::from_str(AUTOMATIC_LOOP_CODE),
                )?);
            }

            let enter_effects = get(&node, "enterEffects")?;
            if enter_effects.is_truthy()
                && get(&enter_effects, "length")?.as_f64().unwrap_or_default() > 0.0
            {
                let current_context = if context.is_truthy() {
                    spread(context)?
                } else {
                    JsValue::UNDEFINED
                };
                for effect in items(&enter_effects)? {
                    *state = apply_registered_effect(state, &effect?, handlers, &current_context)?;
                }
            }

            let available = method(runtime, "getAvailable", &[state.clone(), context.clone()])?;
            if get(&available, "length")?.as_f64() == Some(0.0) {
                return Ok(false);
            }
            let next_edge = get(&available, "0")?;
            let next = apply_transition(state, &next_edge, evaluators, handlers, context)?;
            if !get(&next, "success")?.is_truthy() || !get(&next, "state")?.is_truthy() {
                return Ok(false);
            }
            *state = get(&next, "state")?;
            Ok(true)
        },
    )?;

    let output = spread(&result)?;
    set(&output, "state", &state)?;
    set(&output, "nextNodeId", &get(&state, "currentNodeId")?)?;
    Ok(output)
}

pub(crate) fn runtime_visit_nodes(runtime: &JsValue) -> JsResult {
    visited_condition_nodes(&get(runtime, "transitions")?, &get(runtime, "triggers")?)
}

pub(crate) fn fingerprint_text(state: &JsValue, visit_nodes: &JsValue) -> Result<String, JsValue> {
    Ok(fingerprint(state, visit_nodes)?
        .as_string()
        .unwrap_or_default())
}

#[wasm_bindgen(js_name = runtimeWalk)]
pub fn walk(
    runtime: &JsValue,
    state: &JsValue,
    max_steps: f64,
    context: &JsValue,
    make_context: &JsValue,
) -> JsResult {
    let visit_nodes = runtime_visit_nodes(runtime)?;
    let mut seen = HashSet::from([fingerprint_text(state, &visit_nodes)?]);
    let mut state = state.clone();
    let steps = Array::new();
    let dynamic_context = !make_context.is_undefined();
    let mut index = 0.0;
    while index < max_steps {
        index += 1.0;
        let step_context = if dynamic_context {
            call(
                make_context,
                &JsValue::UNDEFINED,
                std::slice::from_ref(&state),
            )?
        } else {
            context.clone()
        };
        let available = method(
            runtime,
            "getAvailable",
            &[state.clone(), step_context.clone()],
        )?;
        if get(&available, "length")?.as_f64() == Some(0.0) {
            steps.push(&step_record(
                &clone_state(&state)?,
                &get(&state, "currentNodeId")?,
                &available,
                &JsValue::NULL,
            )?);
            break;
        }

        let result = method(
            runtime,
            "step",
            &[state, get(&available, "0")?, step_context],
        )?;
        let next_state = get(&result, "state")?;
        let identity = fingerprint_text(&next_state, &visit_nodes)?;
        let snapshot = if dynamic_context {
            next_state.clone()
        } else {
            clone_state(&next_state)?
        };
        steps.push(&step_record(
            &snapshot,
            &get(&next_state, "currentNodeId")?,
            &available,
            &result,
        )?);
        if !seen.insert(identity) {
            break;
        }
        state = next_state;
    }
    Ok(steps.into())
}

fn step_record(
    state: &JsValue,
    node: &JsValue,
    available: &JsValue,
    applied: &JsValue,
) -> JsResult {
    record(&[
        ("state", state),
        ("nodeId", node),
        ("available", available),
        ("applied", applied),
    ])
}

#[wasm_bindgen(js_name = runtimeEnumeratePaths)]
pub fn enumerate_paths(
    runtime: &JsValue,
    max_depth: f64,
    max_paths: f64,
    context: &JsValue,
) -> JsResult {
    let host = JsPathHost {
        runtime,
        context,
        visit_nodes: runtime_visit_nodes(runtime)?,
    };
    let initial = method(runtime, "createState", &[])?;
    Ok(array(enumerate(&host, initial, max_depth, max_paths)?).into())
}

struct JsPathHost<'a> {
    runtime: &'a JsValue,
    context: &'a JsValue,
    visit_nodes: JsValue,
}

impl PathHost for JsPathHost<'_> {
    type State = JsValue;
    type Transition = JsValue;
    type PathStep = JsValue;
    type Path = JsValue;
    type Fingerprint = String;
    type Error = JsValue;

    fn fingerprint(&self, state: &JsValue) -> Result<String, JsValue> {
        fingerprint_text(state, &self.visit_nodes)
    }

    fn ending(&self, state: &JsValue) -> Result<bool, JsValue> {
        Ok(method(self.runtime, "isEnding", &[get(state, "currentNodeId")?])?.is_truthy())
    }

    fn available(&self, state: &JsValue) -> Result<Vec<JsValue>, JsValue> {
        let values = method(
            self.runtime,
            "getAvailable",
            &[state.clone(), self.context.clone()],
        )?;
        items(&values)?.collect()
    }

    fn take(
        &self,
        state: &JsValue,
        transition: &JsValue,
    ) -> Result<Option<(JsValue, JsValue)>, JsValue> {
        let result = method(
            self.runtime,
            "step",
            &[state.clone(), transition.clone(), self.context.clone()],
        )?;
        let success = get(&result, "success")?;
        let next_state = get(&result, "state")?;
        if !success.is_truthy() || !next_state.is_truthy() {
            return Ok(None);
        }
        let from = get(state, "currentNodeId")?;
        let to = get(&result, "nextNodeId")?;
        let step = record(&[
            ("transitionId", &get(transition, "id")?),
            ("fromNodeId", &from),
            ("toNodeId", if nullish(&to) { &from } else { &to }),
            ("success", &success),
        ])?;
        Ok(Some((next_state, step)))
    }

    fn path(&self, state: &JsValue, steps: &[JsValue], ending: PathEnding) -> JsResult {
        record(&[
            ("steps", array(steps.iter().cloned()).as_ref()),
            ("finalNodeId", &get(state, "currentNodeId")?),
            ("endedAt", &JsValue::from_str(ending.as_str())),
            ("state", &clone_state(state)?),
        ])
    }
}
