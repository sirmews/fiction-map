import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./App"

document.body.style.margin = "0"
document.body.style.fontFamily =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
document.body.style.background = "#f4f1e8"
document.body.style.color = "#1c1a17"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Dashboard root element was not found")
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
