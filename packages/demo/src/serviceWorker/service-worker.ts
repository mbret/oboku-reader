/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */
import { configure } from "@prose-reader/streamer"
import { swStreamer } from "../reader/streamer/swStreamer.sw"

declare const self: ServiceWorkerGlobalScope

configure({
  enableReport: !import.meta.env.PROD
})

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
console.log(self.__WB_MANIFEST)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
self.addEventListener("install", function (e: ExtendableEvent & any) {
  console.log("service worker install")
  e.waitUntil(self.skipWaiting()) // Activate worker immediately

  setTimeout(async () => {
    const client = await self.clients.get(e.clientId)
    if (!e.clientId) {
      console.log("no client id")
      return
    }
    client?.postMessage({
      msg: "Hey I just got a fetch from you!"
    })
  })
})

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim()) // Become available to all pages
})

self.addEventListener("fetch", swStreamer.fetchEventListener)
