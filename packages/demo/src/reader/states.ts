import { useEffect } from "react"
import { useReader } from "./useReader"
import { signal, SIGNAL_RESET, useObserve } from "reactjrx"

export const usePagination = () => {
  const { reader } = useReader()

  return useObserve(() => reader?.pagination.state$, [reader])
}

export const useIsComics = () => {
  const { reader } = useReader()
  const manifest = useObserve(() => reader?.context.manifest$, [reader])

  return (
    manifest?.renditionLayout === "pre-paginated" ||
    manifest?.spineItems.every((item) => item.renditionLayout === "pre-paginated") ||
    // webtoon
    (manifest?.renditionFlow === `scrolled-continuous` &&
      manifest.renditionLayout === `reflowable` &&
      manifest?.spineItems.every((item) => item.mediaType?.startsWith(`image/`)))
  )
}

export const isQuickMenuOpenSignal = signal({
  key: `isQuickMenuOpenSignal`,
  default: false
})

export const currentHighlight = signal<{ anchorCfi: string; focusCfi: string; text?: string; id: string } | undefined>({
  key: `currentHighlightState`,
  default: undefined
})

export const useResetStateOnUnMount = () => {
  useEffect(() => {
    return () => {
      isQuickMenuOpenSignal.setValue(SIGNAL_RESET)
      currentHighlight.setValue(SIGNAL_RESET)
    }
  }, [])
}