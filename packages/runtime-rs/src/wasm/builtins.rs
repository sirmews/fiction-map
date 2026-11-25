use crate::conditions::{self, ConditionHost, EntitySet, NumericTest};
use crate::formula;
use crate::js_state as state;
use crate::js_util::{method, nullish};
use crate::wasm::{JsResult, get, set};
use js_sys::{Object, Reflect, Set};
use wasm_bindgen::{JsCast, prelude::*};

// The host performs the ECMAScript operations that may invoke user-defined
// coercion hooks or getters. catch returns the original thrown value to Rust.
#[wasm_bindgen(inline_js = "
export function add(a,b){return a+b}
export function subtract(a,b){return a-b}
export function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
export function extend(left,right){return {...left,...right}}
export function withEntry(source,key,value){return {...source,[key]:value}}
export function toNumericValue(value){return +value}
")]
extern "C" {
    #[wasm_bindgen(catch)]
    fn add(a: &JsValue, b: &JsValue) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch)]
    fn subtract(a: &JsValue, b: &JsValue) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch)]
    fn clamp(n: &JsValue, min: &JsValue, max: &JsValue) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch)]
    fn extend(left: &JsValue, right: &JsValue) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch,js_name=withEntry)]
    fn with_entry(source: &JsValue, key: &JsValue, value: &JsValue) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch,js_name=toNumericValue)]
    fn numeric(value: &JsValue) -> Result<f64, JsValue>;
}

fn optional(obj: &JsValue, key: &str) -> JsResult {
    if nullish(obj) {
        Ok(JsValue::UNDEFINED)
    } else {
        get(obj, key)
    }
}

struct LiveCondition<'a> {
    state: &'a JsValue,
    item: &'a JsValue,
    context: &'a JsValue,
}

impl ConditionHost for LiveCondition<'_> {
    type Error = JsValue;
    fn variable_equals(&self, flags: bool) -> Result<Option<bool>, JsValue> {
        let key = get(self.item, "key")?;
        let expected = get(self.item, "value")?;
        let actual = if flags {
            state::get_flag(self.state, &key)?
        } else {
            state::get_variable(self.state, &key)?
        };
        Ok(Some(actual == expected))
    }
    fn variable_number(&self, test: NumericTest) -> Result<bool, JsValue> {
        let key = get(self.item, "key")?;
        let expected = get(self.item, "value")?.as_f64();
        let actual = state::get_variable(self.state, &key)?.as_f64();
        Ok(actual
            .zip(expected)
            .is_some_and(|(a, b)| test.compare(a, b)))
    }
    fn has_key(&self, flags: bool) -> Result<bool, JsValue> {
        let key = get(self.item, "key")?;
        let map = get(self.state, if flags { "flags" } else { "variables" })?;
        Reflect::has(&map, &key)
    }
    fn flag_unset(&self) -> Result<bool, JsValue> {
        let key = get(self.item, "key")?;
        let flags = get(self.state, "flags")?;
        Ok(!Reflect::has(&flags, &key)? || state::get_flag(self.state, &key)?.is_falsy())
    }
    fn visited(&self) -> Result<Option<bool>, JsValue> {
        Ok(Some(state::has_visited(
            self.state,
            &get(self.item, "nodeId")?,
        )?))
    }
    fn at_current_node(&self) -> Result<bool, JsValue> {
        let node = get(self.item, "nodeId")?;
        Ok(get(self.state, "currentNodeId")? == node)
    }
    fn entity(&self, set: EntitySet) -> Result<bool, JsValue> {
        let id = get(self.item, "entityId")?;
        if !id.is_string() {
            return Ok(false);
        }
        let ids = optional(
            &optional(self.context, "derivedState")?,
            set.derived_key(),
        )?;
        if !nullish(&ids) && method(&ids, "has", std::slice::from_ref(&id))?.is_truthy() {
            return Ok(true);
        }
        match set {
            EntitySet::Owned => state::owns_entity(self.state, &id),
            EntitySet::Active => state::entity_is_active(self.state, &id),
            EntitySet::Unlocked => state::entity_is_unlocked(self.state, &id),
        }
    }
    fn resource(&self, test: NumericTest) -> Result<bool, JsValue> {
        let key = get(self.item, "key")?;
        let expected = get(self.item, "value")?;
        if !key.is_string() {
            return Ok(false);
        }
        let Some(expected) = expected.as_f64() else {
            return Ok(false);
        };
        let actual = state::get_resource(self.state, &key)?;
        Ok(test.compare(numeric(&actual)?, expected))
    }
}

#[wasm_bindgen(js_name=evaluateBuiltinCondition)]
pub fn evaluate_condition(
    kind: &str,
    state: &JsValue,
    item: &JsValue,
    context: &JsValue,
) -> Result<bool, JsValue> {
    conditions::evaluate_with(
        kind,
        &LiveCondition {
            state,
            item,
            context,
        },
    )
}

#[wasm_bindgen(js_name=evaluateFormula)]
pub fn evaluate_formula(text: &str, state: &JsValue) -> Result<f64, JsValue> {
    formula::evaluate_with(text, |key| {
        let entities = get(state, "entityState")?;
        let value = optional(&optional(&entities, "resources")?, key)?;
        if let Some(value) = value.as_f64() {
            return Ok(Some(value));
        }
        Ok(state::get_variable(state, &key.into())?.as_f64())
    })
}

#[wasm_bindgen(js_name=applyBuiltinEffect)]
pub fn apply_effect(kind: &str, state: &JsValue, effect: &JsValue) -> JsResult {
    use crate::effects::EffectKind::*;
    let Some(kind) = crate::effects::EffectKind::parse(kind) else {
        return Ok(state.clone());
    };
    let param = |name: &str| get(effect, name);
    match kind {
        SetVariable => state::set_variable(state, &param("key")?, &param("value")?),
        SetFlag => state::set_flag(state, &param("key")?, &param("value")?),
        ClearFlag => state::clear_flag(state, &param("key")?),
        DeleteVariable => {
            let key = param("key")?;
            let snapshot = state::clone_state(state)?;
            Reflect::delete_property(get(&snapshot, "variables")?.unchecked_ref::<Object>(), &key)?;
            Ok(snapshot)
        }
        Increment | Decrement => {
            let key = param("key")?;
            let delta = param("delta")?;
            let current = state::get_variable(state, &key)?;
            if current.as_f64().is_none() {
                return Ok(state.clone());
            }
            let value = if let (Some(value), Some(delta)) = (current.as_f64(), delta.as_f64()) {
                crate::effects::variable_delta(value, delta, kind == Decrement).into()
            } else if kind == Increment {
                add(&current, &delta)?
            } else {
                subtract(&current, &delta)?
            };
            state::set_variable(state, &key, &value)
        }
        Clamp => {
            let key = param("key")?;
            let min = param("min")?;
            let max = param("max")?;
            let current = state::get_variable(state, &key)?;
            if current.as_f64().is_none() {
                return Ok(state.clone());
            }
            let value = if let (Some(value), Some(min), Some(max)) =
                (current.as_f64(), min.as_f64(), max.as_f64())
            {
                crate::effects::clamp_number(value, min, max).into()
            } else {
                clamp(&current, &min, &max)?
            };
            state::set_variable(state, &key, &value)
        }
        MarkVisited => {
            let id = param("nodeId")?;
            let snapshot = state::clone_state(state)?;
            get(&snapshot, "visited")?.unchecked_ref::<Set>().add(&id);
            Ok(snapshot)
        }
        Navigate => state::navigate_to_node(state, &param("nodeId")?),
        SetExtension | MergeExtension => {
            let key = param("key")?;
            let mut value = param("value")?;
            if key
                .as_string()
                .is_some_and(|key| crate::state::is_forbidden_state_key(&key))
            {
                return Ok(state.clone());
            }
            let snapshot = state::clone_state(state)?;
            let extensions = get(&snapshot, "extensions")?;
            if kind == MergeExtension {
                let previous = if nullish(&extensions) {
                    JsValue::UNDEFINED
                } else {
                    Reflect::get(&extensions, &key)?
                };
                value = extend(&previous, &value)?;
            }
            set(
                &snapshot,
                "extensions",
                &with_entry(&extensions, &key, &value)?,
            )?;
            Ok(snapshot)
        }
        GrantEntity | RevokeEntity | ActivateEntity | DeactivateEntity | UnlockEntity
        | LockEntity => {
            let id = param("entityId")?;
            if !id.is_string() {
                return Ok(state.clone());
            }
            match kind {
                GrantEntity => state::grant_entity(state, &id),
                RevokeEntity => state::revoke_entity(state, &id),
                ActivateEntity => state::activate_entity(state, &id),
                DeactivateEntity => state::deactivate_entity(state, &id),
                UnlockEntity => state::unlock_entity(state, &id),
                _ => state::lock_entity(state, &id),
            }
        }
        AddResource | SpendResource => {
            let key = param("key")?;
            let amount = param("amount")?;
            let formula = param("formula")?;
            let options = if kind == SpendResource {
                super::record(&[
                    ("allowNegative", &param("allowNegative")?),
                    ("clampToZero", &param("clampToZero")?),
                ])?
            } else {
                JsValue::UNDEFINED
            };
            if !key.is_string() {
                return Ok(state.clone());
            }
            let amount = match formula.as_string() {
                Some(text) => evaluate_formula(&text, state)?.into(),
                None => amount,
            };
            if amount.as_f64().is_none() {
                return Ok(state.clone());
            }
            if kind == AddResource {
                state::add_resource(state, &key, &amount)
            } else {
                state::spend_resource(state, &key, &amount, &options)
            }
        }
        NoOp => Ok(state.clone()),
    }
}
