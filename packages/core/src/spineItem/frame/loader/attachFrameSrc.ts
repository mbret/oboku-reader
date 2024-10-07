import {
  catchError,
  from,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  tap,
} from "rxjs"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { Report } from "../../../report"
import { ITEM_EXTENSION_VALID_FOR_FRAME_SRC } from "../../../constants"
import { createHtmlPageFromResource } from "../createHtmlPageFromResource"
import { Manifest } from "@prose-reader/shared"

export const attachFrameSrc = ({
  settings,
  item,
}: {
  settings: ReaderSettingsManager
  item: Manifest[`spineItems`][number]
}) => {
  const getHtmlFromResource = (response: Response) =>
    createHtmlPageFromResource(response, item)

  return (stream: Observable<HTMLIFrameElement>) =>
    stream.pipe(
      switchMap((frameElement) => {
        const { fetchResource } = settings.values

        // @todo move fetch resource logic into an enhancer and have the core
        // be just getting an url to attach to the ifram

        /**
         * Because of the bug with iframe and sw, we should not use srcdoc and sw together for
         * html document. This is because resources will not pass through SW. IF `fetchResource` is being
         * used the user should be aware of the limitation. We use srcdoc for everything except if we detect
         * an html document and same origin. Hopefully that bug gets fixed one day.
         * @see https://bugs.chromium.org/p/chromium/issues/detail?id=880768
         */
        if (
          !fetchResource &&
          item.href.startsWith(window.location.origin) &&
          // we have an encoding and it's a valid html
          ((item.mediaType &&
            [
              `application/xhtml+xml`,
              `application/xml`,
              `text/html`,
              `text/xml`,
            ].includes(item.mediaType)) ||
            // no encoding ? then try to detect html
            (!item.mediaType &&
              ITEM_EXTENSION_VALID_FOR_FRAME_SRC.some((extension) =>
                item.href.endsWith(extension),
              )))
        ) {
          frameElement?.setAttribute(`src`, item.href)

          return of(frameElement)
        } else {
          const fetchFn = fetchResource || (() => fetch(item.href))

          return from(fetchFn(item)).pipe(
            mergeMap((response) => getHtmlFromResource(response)),
            tap((htmlDoc) => {
              if (htmlDoc) {
                const blob = new Blob([htmlDoc], { type: "text/html" })
                /**
                 * The blob will be released once the document is destroyed.
                 * No need to deal with it ourselves.
                 */
                const blobURL = URL.createObjectURL(blob)

                frameElement?.setAttribute(`src`, blobURL)
              }
            }),
            map(() => frameElement),
            catchError((e) => {
              Report.error(
                `Error while trying to fetch or load resource for item ${item.id}`,
              )
              console.error(e)

              return of(frameElement)
            }),
          )
        }
      }),
    )
}
