import { distinctUntilChanged, map, withLatestFrom } from "rxjs"
import { Reader } from "../../reader"
import { isShallowEqual } from "../../utils/objects"

export type State = ReturnType<typeof observeState>

export const observeState = (reader: Reader) => {
  return reader.pagination.paginationInfo$.pipe(
    withLatestFrom(reader.context.manifest$, reader.settings.settings$),
    map(([paginationInfo, manifest, { computedPageTurnDirection }]) => {
      const numberOfSpineItems = manifest?.spineItems.length ?? 0
      const isAtAbsoluteBeginning =
        paginationInfo.beginSpineItemIndex === 0 &&
        paginationInfo.beginPageIndexInSpineItem === 0
      const isAtAbsoluteEnd =
        paginationInfo.endPageIndexInSpineItem ===
          paginationInfo.endNumberOfPagesInSpineItem - 1 &&
        paginationInfo.endSpineItemIndex === Math.max(numberOfSpineItems - 1, 0)

      return {
        canGoTopSpineItem:
          computedPageTurnDirection === "vertical" && !isAtAbsoluteBeginning,
        canGoBottomSpineItem:
          computedPageTurnDirection === "vertical" && !isAtAbsoluteEnd,
        canGoLeftSpineItem:
          computedPageTurnDirection !== "vertical" &&
          ((manifest?.readingDirection === "ltr" && !isAtAbsoluteBeginning) ||
            (manifest?.readingDirection === "rtl" && !isAtAbsoluteEnd)),
        canGoRightSpineItem:
          computedPageTurnDirection !== "vertical" &&
          ((manifest?.readingDirection === "ltr" && !isAtAbsoluteEnd) ||
            (manifest?.readingDirection === "rtl" && !isAtAbsoluteBeginning)),
      }
    }),
    distinctUntilChanged(isShallowEqual),
  )
}
