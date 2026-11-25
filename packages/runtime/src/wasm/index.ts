import { bytes } from "./generated/bytes"
import * as bindings from "./generated/runtime.js"

function decodeModule(encoded: string): Uint8Array<ArrayBuffer> {
  const ctor = Uint8Array as Uint8ArrayConstructor & {
    fromBase64?: (input: string) => Uint8Array<ArrayBuffer>
  }
  if (ctor.fromBase64) return ctor.fromBase64(encoded)
  const binary = atob(encoded)
  const result = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) result[index] = binary.charCodeAt(index)
  return result
}

// All public calls are synchronous, including the first call after import.
bindings.initSync({ module: decodeModule(bytes) })
export const wasm = bindings
