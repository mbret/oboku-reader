import {
  combineLatest,
  from,
  map,
  mergeMap,
  type Observable,
  of,
  switchMap,
  tap,
} from "rxjs"
import { ResourceHandler } from "../../../spineItem/resources/ResourceHandler"
import type { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { getParentPath, type Manifest } from "@prose-reader/shared"
import type { Context } from "../../../context/Context"

/**
 * @important Firefox handles file protocol weirdly and will not
 * go up one directory when using "../". We temporarily replace to http://
 * to keep our behavior.
 */
const joinPath = (base: string, path: string) => {
  // Temporarily replace file:// with http:// for consistent URL handling
  const isFileProtocol = base.startsWith("file://")
  const tempBase = isFileProtocol ? base.replace("file://", "http://") : base
  const result = new URL(path, tempBase).toString()

  // Convert back to file:// if needed
  return isFileProtocol ? result.replace("http://", "file://") : result
}

const getElementsWithAssets = (document: Document | null | undefined) => {
  const RESOURCE_ELEMENTS = [
    "img", // Images
    "video", // Video files
    "audio", // Audio files
    "source", // Source elements within video/audio
    "link", // Stylesheets and other linked resources
    "script", // JavaScript files
  ].join(",")

  return Array.from(document?.querySelectorAll(RESOURCE_ELEMENTS) || [])
}

export const loadAssets =
  ({
    settings,
    item,
    context,
  }: {
    settings: ReaderSettingsManager
    item: Manifest["items"][number]
    context: Context
  }) =>
  (stream: Observable<HTMLIFrameElement>) =>
    stream.pipe(
      switchMap((frameElement) => {
        const elementsWithAsset = getElementsWithAssets(
          frameElement.contentDocument,
        )

        const assetsLoad$ = Array.from(elementsWithAsset).map((element) => {
          const originalSrc =
            element.getAttribute("src") || element.getAttribute("href")

          if (!originalSrc) return of(null)

          // EPUB/cover.html -> EPUB/
          const spineItemUriParentPath = getParentPath(item.href)

          // EPUB/image.png needs to match frame relative src /image.png
          const foundItem = context.manifest?.items.find(({ href }) => {
            // this will remove things like "../.." and have a normal relative path
            return `${joinPath(spineItemUriParentPath, originalSrc).toLowerCase()}`.endsWith(
              `${href.toLowerCase()}`,
            )
          })

          if (!foundItem) return of(null)

          const resourceHandler = new ResourceHandler(foundItem, settings)

          /**
           * For each resources, if it's a response and not a URL, we should convert it to a blob
           * because it will not be accessible otherwise.
           */
          return from(resourceHandler.getResource()).pipe(
            mergeMap((resource) =>
              resource instanceof Response
                ? from(resource.blob())
                : of(undefined),
            ),
            tap((blob) => {
              if (blob) {
                const blobUrl = URL.createObjectURL(blob)

                if (element.hasAttribute("src")) {
                  element.setAttribute("src", blobUrl)
                } else if (element.hasAttribute("href")) {
                  element.setAttribute("href", blobUrl)
                }
              }
            }),
          )
        })

        return combineLatest(assetsLoad$).pipe(map(() => frameElement))
      }),
    )

export const unloadMedias = (frameElement?: HTMLIFrameElement) => {
  const elementsWithAsset = getElementsWithAssets(frameElement?.contentDocument)

  elementsWithAsset.forEach((element) => {
    const url = element.getAttribute("src") || element.getAttribute("href")

    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url)
    }
  })
}
