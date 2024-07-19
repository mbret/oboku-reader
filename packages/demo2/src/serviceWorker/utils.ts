import { STREAMER_URL_PREFIX } from "./constants"

const extractEpubLocationFromUrl = (url: string) => {
  const { pathname } = new URL(url)
  const urlWithoutPrefix = pathname.substring(`/${STREAMER_URL_PREFIX}/`.length)
  const nextSlashIndex = urlWithoutPrefix.indexOf("/")

  if (nextSlashIndex !== -1) {
    return urlWithoutPrefix.substring(0, urlWithoutPrefix.indexOf("/"))
  }

  return urlWithoutPrefix
}

export const getEpubUrlFromLocation = (epubLocation: string) => {
  try {
    return atob(epubLocation)
  } catch (e) {
    return `${location.origin}/epubs/${epubLocation}`
  }
}

export const getEpubFilenameFromUrl = (url: string) => {
  return url.substring(url.lastIndexOf("/") + 1)
}

export const extractInfoFromEvent = (event: any) => {
  const epubLocation = extractEpubLocationFromUrl(event.request.url)
  const epubUrl = getEpubUrlFromLocation(epubLocation)

  return {
    epubUrl,
    epubLocation
  }
}

export const getResourcePath = (event: any) => {
  const url = new URL(event.request.url)
  const { epubLocation } = extractInfoFromEvent(event)

  return decodeURIComponent(url.pathname.replace(`/${STREAMER_URL_PREFIX}/${epubLocation}/`, ``))
}
