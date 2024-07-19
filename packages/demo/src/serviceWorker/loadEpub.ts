import { loadAsync } from "jszip"
import { createArchiveFromText, Archive, createArchiveFromJszip } from "@prose-reader/streamer"
import localforage from "localforage"
import { getEpubFilenameFromUrl } from "./utils"

let loading = false
let archive: Archive | undefined = undefined
let lastUrl: string | undefined
let cleanupInterval: NodeJS.Timeout | number

const cleanup = () => {
  clearInterval(cleanupInterval as NodeJS.Timeout)
  cleanupInterval = setInterval(
    () => {
      if (!loading && archive) {
        console.log(`serviceWorker`, `cleaning up unused epub archive reference (after 5mn)`)
        archive = undefined
        lastUrl = undefined
      }
    },
    5 * 60 * 1000
  )
}

export const loadEpub = async (url: string) => {
  try {
    cleanup()
    if (url !== lastUrl) {
      archive = undefined
      loading = false
    }

    if (archive) {
      return archive
    }

    if (loading) {
      return new Promise<Archive>((resolve) => {
        setTimeout(async () => {
          resolve(await loadEpub(url))
        }, 100)
      })
    }
    loading = true
    archive = undefined

    const responseOrFile = url.startsWith(`file://`)
      ? await localforage.getItem<File>(getEpubFilenameFromUrl(url))
      : await fetch(url)

    if (!responseOrFile) {
      throw new Error(`Unable to retrieve ${url}`)
    }

    if (url.endsWith(`.txt`)) {
      const content = await responseOrFile.text()
      archive = await createArchiveFromText(content)
    } else {
      const epubData = `blob` in responseOrFile ? await responseOrFile.blob() : responseOrFile
      const name = epubData.name
      const jszip = await loadAsync(epubData)

      archive = await createArchiveFromJszip(jszip, { orderByAlpha: true, name })
    }

    lastUrl = url
    loading = false

    return archive
  } catch (e) {
    loading = false

    throw e
  }
}
