import type { Manifest } from "@prose-reader/shared"

declare global {
  interface Window {
    __PROSE_READER_DEBUG?: boolean
  }
}

export { Manifest }
