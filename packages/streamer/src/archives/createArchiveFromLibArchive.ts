/**
 * @see https://github.com/nika-begiashvili/libarchivejs.
 *
 * Does not work in service worker due to usage of web worker.
 */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Report } from "../report"
import { Archive } from "./types"

interface ArchiveReader {
  getFilesArray(): Promise<any[]>
  /**
   * Terminate worker to free up memory
   */
  close(): Promise<void>
}

/**
 * Represents compressed file before extraction
 */
interface CompressedFile {
  /**
   * File name
   */
  get name(): string
  /**
   * File size
   */
  get size(): number
  get lastModified(): number
  /**
   * Extract file from archive
   * @returns {Promise<File>} extracted file
   */
  extract(): any
}

export const createArchiveFromLibArchive = async (
  libArchive: ArchiveReader,
  { name }: { orderByAlpha?: boolean; name?: string } = {},
): Promise<Archive> => {
  const objArray = await libArchive.getFilesArray()

  const archive: Archive = {
    close: () => libArchive.close(),
    filename: name ?? ``,
    files: objArray.map((item: { file: CompressedFile; path: string }) => ({
      dir: false,
      basename: item.file.name,
      size: item.file.size,
      uri: `${item.path}${item.file.name}`,
      base64: async () => {
        return ``
      },
      blob: async () => {
        const file = await (item.file.extract() as Promise<File>)

        return file
      },
      string: async () => {
        const file = await (item.file.extract() as Promise<File>)

        return file.text()
      },
    })),
  }

  Report.log("Generated archive", archive)

  return archive
}