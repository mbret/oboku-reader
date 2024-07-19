import { createApp } from "./raw/createApp"

window.__PROSE_READER_DEBUG = !import.meta.env.PROD

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js", {})
      .then((registration) => {
        console.log("SW registered: ", registration)
        createApp()
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError)
      })
  })
}
