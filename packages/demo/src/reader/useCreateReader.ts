import { useEffect } from "react"
import { readerSignal } from "./useReader"
import { SIGNAL_RESET } from "reactjrx"

import { bookmarksEnhancer } from "@prose-reader/enhancer-bookmarks"
import { searchEnhancer } from "@prose-reader/enhancer-search"
import { highlightsEnhancer } from "@prose-reader/enhancer-highlights"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { createReader } from "@prose-reader/core"
import { webStreamer } from "./streamer/webStreamer"
import { STREAMER_URL_PREFIX } from "../constants.shared"

export type ReaderInstance = ReturnType<typeof createAppReader>

export const createAppReader = gesturesEnhancer(
  highlightsEnhancer(
    bookmarksEnhancer(
      searchEnhancer(
        // __
        createReader
      )
    )
  )
)

export const useCreateReader = () => {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)

    const readerOptions: Parameters<typeof createAppReader>[0] = {
      pageTurnAnimation: `slide`,
      layoutAutoResize: `container`,
      numberOfAdjacentSpineItemToPreLoad: 3,
      pageTurnDirection: query.has("vertical") ? `vertical` : `horizontal`,
      pageTurnMode: query.has("free") ? `scrollable` : `controlled`,
      gestures: {
        fontScalePinchEnabled: true
      },
      // fetchResource: (item) => {
      //   const baseUrl = `${window.location.origin}/${STREAMER_URL_PREFIX}`
      //   const streamerPath = item.href.substring(baseUrl.length + `/`.length)
      //   const [key = ``] = streamerPath.split("/")
      //   const resourcePath = item.href.substring(`${baseUrl}/${key}/`.length)

      //   return webStreamer.fetchResource({
      //     key,
      //     resourcePath
      //   })
      // }
    }

    const instance = createAppReader(readerOptions)

    readerSignal.setValue(instance)

    return () => {
      instance.destroy()

      readerSignal.setValue(SIGNAL_RESET)
    }
  }, [])
}
