//! Live JavaScript host for the synchronous package API.
mod builtins;
pub(crate) mod transition;

use js_sys::{Object, Reflect};
use wasm_bindgen::prelude::*;

pub(crate) type JsResult = Result<JsValue, JsValue>;

// wasm-bindgen gives static strings permanent externref slots. Dynamic graph
// keys stay uncached, so user input cannot grow an intern table.
macro_rules! property_keys {
    ($($name:ident = $key:tt),* $(,)?) => {
        #[wasm_bindgen]
        extern "C" {
            $(#[wasm_bindgen(thread_local_v2, static_string)]
              static $name: js_sys::JsString = $key;)*
        }
        #[inline(always)]
        fn with_key<T>(key: &str, f: impl FnOnce(&JsValue)->T)->T {
            match key {
                $($key=>$name.with(|value| f(value)),)*
                other=>f(&JsValue::from_str(other)),
            }
        }
    };
}

property_keys! {
    CURRENT_NODE_ID = "currentNodeId",
    HISTORY = "history",
    VARIABLES = "variables",
    FLAGS = "flags",
    VISITED = "visited",
    ENTITY_STATE = "entityState",
    EXTENSIONS = "extensions",
    OWNED = "owned",
    ACTIVE = "active",
    UNLOCKED = "unlocked",
    RESOURCES = "resources",
    TYPE = "type",
    KEY = "key",
    VALUE = "value",
    ID = "id",
    CONDITIONS = "conditions",
    EFFECTS = "effects",
    TRIGGERS = "triggers",
    SOURCE_NODE_ID = "sourceNodeId",
    TARGET_NODE_ID = "targetNodeId",
    ALL = "all",
    ANY = "any",
    NONE = "none",
    REQUIREMENTS = "requirements",
    VISIBILITY = "visibility",
    TRACE = "trace",
    DERIVED_STATE = "derivedState",
    SUCCESS = "success",
    STATE = "state",
    ALLOWED = "allowed",
    VISIBLE = "visible",
    LENGTH = "length",
    NODES = "nodes",
    TRANSITIONS = "transitions",
    CONDITIONS_EVALUATED = "conditionsEvaluated",
    EFFECTS_APPLIED = "effectsApplied",
    RESOURCE = "resource",
    OWNED_ENTITY_IDS = "ownedEntityIds",
    ACTIVE_ENTITY_IDS = "activeEntityIds",
    EFFECTIVE_ENTITY_IDS = "effectiveEntityIds",
    FAILURE_EFFECTS = "failureEffects",
    FAILURE_TARGET_NODE_ID = "failureTargetNodeId",
    ENTER_EFFECTS = "enterEffects",
    AUTO_RESOLVE = "autoResolve",
    NODE_ID = "nodeId",
    ENTITY_ID = "entityId",
    AMOUNT = "amount",
    FORMULA = "formula",
}

#[inline]
pub(crate) fn get(value: &JsValue, key: &str) -> JsResult {
    with_key(key, |key| Reflect::get(value, key))
}

#[inline]
pub(crate) fn set(object: &JsValue, key: &str, value: &JsValue) -> Result<(), JsValue> {
    with_key(key, |key| Reflect::set(object, key, value))?;
    Ok(())
}

pub(crate) fn record(fields: &[(&str, &JsValue)]) -> JsResult {
    let object: JsValue = Object::new().into();
    for (key, value) in fields {
        set(&object, key, value)?;
    }
    Ok(object)
}

// Object spread includes enumerable symbols and treats "__proto__" as an own
// property. Object.assign and JSON serialization both change those semantics.
#[wasm_bindgen(inline_js = "export function spread(value) { return {...value}; }")]
extern "C" {
    #[wasm_bindgen(catch)]
    pub(crate) fn spread(value: &JsValue) -> Result<JsValue, JsValue>;
}
