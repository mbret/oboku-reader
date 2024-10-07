import { createArchiveFromText, createArchiveFromJszip } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import localforage from "localforage"

export const getArchive = async (key) => {
  const demoEpubUrl = atob(key)
  const epubFilenameFromUrl = demoEpubUrl.substring(demoEpubUrl.lastIndexOf("/") + 1)

  const responseOrFile = demoEpubUrl.startsWith(`file://`)
    ? await localforage.getItem<File>(epubFilenameFromUrl)
    : await fetch(demoEpubUrl)

  if (!responseOrFile) {
    throw new Error(`Unable to retrieve ${demoEpubUrl}`)
  }

  if (demoEpubUrl.endsWith(`.txt`)) {
    const content = await responseOrFile.text()
    return await createArchiveFromText(content)
  } else {
    const epubData = `blob` in responseOrFile ? await responseOrFile.blob() : responseOrFile
    const name = epubData.name
    const jszip = await loadAsync(epubData)

    return await createArchiveFromJszip(jszip, { orderByAlpha: true, name })
  }
}
