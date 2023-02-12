import { Manifest } from "@prose-reader/shared"
import { getArchiveOpfInfo } from "../../../archives/getArchiveOpfInfo"
import { Archive } from "../../../archives/types"
import { getItemsFromDoc } from "../../manifest/hooks/epub"
import xmldoc from "xmldoc"
import { HookResource } from "./types"

const getMetadata = async (archive: Archive, resourcePath: string) => {
  const opfInfo = getArchiveOpfInfo(archive)
  const data = await opfInfo.data?.string()

  if (data) {
    const opfXmlDoc = new xmldoc.XmlDocument(data)
    const items = getItemsFromDoc(opfXmlDoc)

    return {
      mediaType: items.find((item) => resourcePath.endsWith(item.href))?.mediaType,
    }
  }

  return {
    mediaType: getContentTypeFromExtension(resourcePath),
  }
}

const getContentTypeFromExtension = (uri: string) => {
  if (uri.endsWith(`.css`)) {
    return `text/css; charset=UTF-8`
  }
  if (uri.endsWith(`.jpg`)) {
    return `image/jpg`
  }
  if (uri.endsWith(`.xhtml`)) {
    return `application/xhtml+xml`
  }
  if (uri.endsWith(`.mp4`)) {
    return `video/mp4`
  }
  if (uri.endsWith(`.svg`)) {
    return `image/svg+xml`
  }
}

export const defaultHook =
  ({ archive, resourcePath }: { archive: Archive; resourcePath: string }) =>
  async (resource: HookResource): Promise<HookResource> => {
    const file = Object.values(archive.files).find((file) => file.uri === resourcePath)

    if (!file) return resource

    // if (file.stream) {
    //   const stream = file.stream()

    //   console.log(file, stream)
    //   stream.on(`data`, data => {
    //     console.log(`data`, data)
    //   })
    //   stream.on(`error`, data => {
    //     console.error(`error`, data)
    //   })
    //   stream.on(`end`, () => {
    //     console.log(`end`)
    //   })

    // }

    // const stream = file.stream!()

    // const readableStream = new ReadableStream({
    //   start(controller) {
    //     function push() {
    //       stream.on(`data`, data => {
    //         controller.enqueue(data)
    //       })
    //       stream.on(`error`, data => {
    //         console.error(`error`, data)
    //       })
    //       stream.on(`end`, () => {
    //         controller.close()
    //       })

    //       stream.resume()
    //     }

    //     push();
    //   }
    // })

    const metadata = await getMetadata(archive, resourcePath)

    return {
      ...resource,
      params: {
        ...resource.params,
        status: 200,
        headers: {
          ...(file?.encodingFormat && {
            "Content-Type": file.encodingFormat,
          }),
          ...(metadata.mediaType && {
            "Content-Type": metadata.mediaType,
          }),
        },
      },
    }
  }
