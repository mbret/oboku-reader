import { ServiceWorkerStreamer } from "@prose-reader/streamer"
import { STREAMER_URL_PREFIX } from "../../constants.shared"
import { getArchive } from "./getArchive.shared"

export const swStreamer = new ServiceWorkerStreamer({
  cleanArchiveAfter: 5 * 60 * 1000,
  getUriInfo: (event) => {
    const url = new URL(event.request.url)

    if (!url.pathname.startsWith(`/${STREAMER_URL_PREFIX}`)) {
      return undefined
    }

    return { baseUrl: `${url.origin}/${STREAMER_URL_PREFIX}` }
  },
  getArchive
})
