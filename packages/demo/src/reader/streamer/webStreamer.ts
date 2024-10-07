import { Streamer } from "@prose-reader/streamer"
import { getArchive } from "./getArchive.shared"

export const webStreamer = new Streamer({
  cleanArchiveAfter: 5 * 60 * 1000,
  getArchive
})
