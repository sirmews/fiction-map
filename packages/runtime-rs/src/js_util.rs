use js_sys::{Array, TypeError};
use wasm_bindgen::prelude::*;

use crate::wasm::JsResult;

pub(crate) fn array(values: impl IntoIterator<Item = JsValue>) -> Array {
    values.into_iter().collect()
}

// Keep argument arrays within the JS host. This also avoids reading a callback's
// own "call" or "apply" properties when invoking it.
#[wasm_bindgen(inline_js = r#"
export const call0 = (fn, target) => Reflect.apply(fn, target, []);
export const call1 = (fn, target, a) => Reflect.apply(fn, target, [a]);
export const call2 = (fn, target, a, b) => Reflect.apply(fn, target, [a, b]);
export const call3 = (fn, target, a, b, c) => Reflect.apply(fn, target, [a, b, c]);
export const callMany = (fn, target, args) => Reflect.apply(fn, target, args);
export const method0 = (target, name) => target[name]();
export const method1 = (target, name, a) => target[name](a);
export const method2 = (target, name, a, b) => target[name](a, b);
export const method3 = (target, name, a, b, c) => target[name](a, b, c);
export const stringifyValue = value => String(value);
// Rust strings require valid UTF-8. Escape lone UTF-16 surrogates and the
// escape character so JavaScript identifiers survive comparison and formatting.
export const portableText = value => String(value).replace(/[\uD800-\uDFFF\uE000]/gu, unit =>
    "\uE000" + (unit === "\uE000" ? unit : String.fromCharCode(unit.charCodeAt(0) + 0x1000)));
export const hostText = value => value.replace(/\uE000([\uE000\uE800-\uEFFF])/gu, (_, unit) =>
    unit === "\uE000" ? unit : String.fromCharCode(unit.charCodeAt(0) - 0x1000));
"#)]
extern "C" {
    #[wasm_bindgen(catch)]
    fn call0(function: &JsValue, target: &JsValue) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch)]
    fn call1(function: &JsValue, target: &JsValue, a: &JsValue) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch)]
    fn call2(
        function: &JsValue,
        target: &JsValue,
        a: &JsValue,
        b: &JsValue,
    ) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch)]
    fn call3(
        function: &JsValue,
        target: &JsValue,
        a: &JsValue,
        b: &JsValue,
        c: &JsValue,
    ) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, js_name = callMany)]
    fn call_many(function: &JsValue, target: &JsValue, args: &Array) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch)]
    fn method0(target: &JsValue, name: &str) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch)]
    fn method1(target: &JsValue, name: &str, a: &JsValue) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch)]
    fn method2(target: &JsValue, name: &str, a: &JsValue, b: &JsValue) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch)]
    fn method3(
        target: &JsValue,
        name: &str,
        a: &JsValue,
        b: &JsValue,
        c: &JsValue,
    ) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, js_name = stringifyValue)]
    pub(crate) fn js_string(value: &JsValue) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, js_name = portableText)]
    fn portable_text(value: &JsValue) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(js_name = hostText)]
    pub(crate) fn host_text(value: &str) -> JsValue;
}

pub(crate) fn call(value: &JsValue, receiver: &JsValue, args: &[JsValue]) -> JsResult {
    match args {
        [] => call0(value, receiver),
        [a] => call1(value, receiver, a),
        [a, b] => call2(value, receiver, a, b),
        [a, b, c] => call3(value, receiver, a, b, c),
        _ => call_many(value, receiver, &array(args.iter().cloned())),
    }
}

pub(crate) fn method(receiver: &JsValue, name: &str, args: &[JsValue]) -> JsResult {
    match args {
        [] => method0(receiver, name),
        [a] => method1(receiver, name, a),
        [a, b] => method2(receiver, name, a, b),
        [a, b, c] => method3(receiver, name, a, b, c),
        _ => call(&crate::wasm::get(receiver, name)?, receiver, args),
    }
}

pub(crate) fn items(value: &JsValue) -> Result<js_sys::IntoIter, JsValue> {
    js_sys::try_iter(value)?.ok_or_else(|| TypeError::new("Value is not iterable").into())
}

pub(crate) fn nullish(value: &JsValue) -> bool {
    value.is_null() || value.is_undefined()
}

pub(crate) fn text(value: &JsValue) -> Result<String, JsValue> {
    Ok(portable_text(value)?.as_string().unwrap_or_default())
}
