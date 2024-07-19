window.__PROSE_READER_DEBUG = !import.meta.env.PROD

import React from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"

const container = document.getElementById("app")

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(
        import.meta.env.MODE === "production" ||
          /**
           * firefox does not support module type for dev service worker.
           * Please build and copy dist service worker in public when developing with firefox
           */
          navigator.userAgent.includes("Firefox/")
          ? "/service-worker.js"
          : "/dev-sw.js?dev-sw",
        {
          type: import.meta.env.MODE === "production" ? "classic" : "module"
        }
      )
      .then((registration) => {
        console.log("SW registered: ", registration)
        if (!container) return
        const root = createRoot(container)
        root.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        )
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError)
      })
  })
} else {
  alert(`Unable to install service worker`)
}
