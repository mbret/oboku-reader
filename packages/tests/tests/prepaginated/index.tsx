import { createReader } from "@prose-reader/core"
import { createArchiveFromJszip, Streamer } from "@prose-reader/streamer"
import { from } from "rxjs"
import { loadAsync } from "jszip"

async function createStreamer() {
  const streamer = new Streamer({
    getArchive: async () => {
      const epubResponse = await fetch("http://localhost:3333/epubs/sous-le-vent.epub")
      const epubBlob = await epubResponse.blob()
      const epubJszip = await loadAsync(epubBlob)
      const archive = await createArchiveFromJszip(epubJszip)

      return archive
    },
    cleanArchiveAfter: 5 * 60 * 1000,
  })

  return streamer
}

async function run() {
  const streamer = await createStreamer()

  const manifestResponse = await streamer.fetchManifest({
    key: `_`,
  })

  const manifest = await manifestResponse.json()

  console.log(manifest)
  
  const reader = createReader({
    layoutLayerTransition: false,
    getResource: (item) => {
      return from(streamer.fetchResource({ key: `_`, resourcePath: item.href }))
    },
  })

  /**
   * Finally we can load the reader with our manifest.
   */
  reader.load({
    containerElement: document.getElementById(`app`)!,
    manifest,
  })
}

run()
