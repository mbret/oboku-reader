import { atom, selector, useRecoilCallback } from "recoil"
import { useEffect } from "react"
import { useReader } from "./reader/useReader"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"

export const isSearchOpenState = atom({
  key: `isSearchOpenState`,
  default: false
})

export const isTocOpenState = atom({
  key: `isTocOpenState`,
  default: false
})

export const isHelpOpenState = atom({
  key: `isHelpOpenState`,
  default: false
})

export const bookReadyState = atom({
  key: `bookReadyState`,
  default: false
})

export const useIsComics = () => {
  const { reader } = useReader()
  const manifest = useObserve(reader?.context.manifest$ ?? NEVER)

  return (
    manifest?.renditionLayout === "pre-paginated" ||
    manifest?.spineItems.every((item) => item.renditionLayout === "pre-paginated") ||
    // webtoon
    (manifest?.renditionFlow === `scrolled-continuous` &&
      manifest.renditionLayout === `reflowable` &&
      manifest?.spineItems.every((item) => item.mediaType?.startsWith(`image/`)))
  )
}

export const isMenuOpenState = atom({
  key: `isMenuOpenState`,
  default: false
})

export const currentHighlight = atom<{ anchorCfi: string; focusCfi: string; text?: string; id: string } | undefined>({
  key: `currentHighlightState`,
  default: undefined
})

export const hasCurrentHighlightState = selector({
  key: `hasCurrentHighlightState`,
  get: ({ get }) => {
    return !!get(currentHighlight)
  }
})

export const isZoomingState = atom<boolean>({
  key: `isZoomingState`,
  default: false
})

const statesToReset = [isMenuOpenState, bookReadyState, currentHighlight]

export const useResetStateOnUnMount = () => {
  const resetStates = useRecoilCallback(
    ({ reset }) =>
      () => {
        statesToReset.forEach((state) => reset(state))
      },
    []
  )

  useEffect(() => {
    return () => resetStates()
  }, [resetStates])
}
