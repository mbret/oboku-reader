/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */
import { loadEpub } from "./loadEpub"
import {
  generateResourceFromArchive,
  generateManifestFromArchive,
  // generateResourceFromError,
  configure
} from "@prose-reader/streamer"
import { STREAMER_URL_PREFIX } from "./constants"
import { extractInfoFromEvent, getResourcePath } from "./utils"

declare const self: ServiceWorkerGlobalScope

configure({
  enableReport: !import.meta.env.PROD
})

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
console.log(self.__WB_MANIFEST)

self.addEventListener("install", function (e: any) {
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

const serveManifest = async (epubUrl: string, baseUrl: string) => {
  const archive = await loadEpub(epubUrl)

  const manifest = await generateManifestFromArchive(archive, { baseUrl })

  return new Response(JSON.stringify(manifest), { status: 200 })
}

const serveResource = async (event: any, epubUrl: string) => {
  try {
    // throw new Error("foo")

    const archive = await loadEpub(epubUrl)
    const resourcePath = getResourcePath(event)

    const resource = await generateResourceFromArchive(archive, resourcePath)

    return new Response(resource.body, resource.params)
  } catch (e) {
    console.error(e)

    // const resource = generateResourceFromError(e)

    // return new Response(resource.body, resource.params)
    return new Response(String(e), { status: 500 })
  }
}

/**
 * Spin up the prose reader streamer.
 * We need to provide our custom function to retrieve the archive.
 * This getter can fetch the epub from internet, indexedDB, etc
 */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  if (url.pathname.startsWith(`/${STREAMER_URL_PREFIX}`)) {
    const { epubUrl, epubLocation } = extractInfoFromEvent(event)

    event.respondWith(
      (async () => {
        try {
          const baseUrl = `${url.origin}/${STREAMER_URL_PREFIX}/${epubLocation}/`

          /**
           * Hit to manifest
           */
          if (url.pathname.endsWith(`/manifest`)) {
            return serveManifest(epubUrl, baseUrl)
          }

          /**
           * Hit to resources
           */
          return serveResource(event, epubUrl)
        } catch (e: any) {
          console.error(e)

          return new Response((e as any).message, { status: 500 })
        }
      })()
    )
  }
})
