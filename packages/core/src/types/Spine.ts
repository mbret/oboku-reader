import { BehaviorSubject, Observable } from "rxjs"
import { SpineItem } from "../spineItem/createSpineItem"
import { createSelection } from "../selection"
import { createCfiLocator } from "../spine/cfiLocator"
import { createSpineLocationResolver } from "../spine/locationResolver"
import { createSpineItemLocator as createSpineItemLocator } from "../spineItem/locationResolver"

type RequireLayout = boolean
type ManipulableSpineItemCallback = Parameters<
  SpineItem[`manipulateSpineItem`]
>[0]
type ManipulableSpineItemCallbackPayload =
  Parameters<ManipulableSpineItemCallback>[0]
type CfiLocator = ReturnType<typeof createCfiLocator>
type SpineItemLocator = ReturnType<typeof createSpineItemLocator>
type Locator = ReturnType<typeof createSpineLocationResolver>

type Event = {
  type: `onSelectionChange`
  data: ReturnType<typeof createSelection> | null
}

export type Spine = {
  element$: BehaviorSubject<HTMLElement>
  scrollHeight$: Observable<number>
  getElement: () => HTMLElement | undefined
  locator: Locator
  spineItemLocator: SpineItemLocator
  cfiLocator: CfiLocator
  layout: () => void
  manipulateSpineItems: (
    cb: (
      payload: ManipulableSpineItemCallbackPayload & { index: number },
    ) => RequireLayout,
  ) => void
  manipulateSpineItem: (
    id: string,
    cb: Parameters<SpineItem[`manipulateSpineItem`]>[0],
  ) => void
  destroy: () => void
  isSelecting: () => boolean | undefined
  getSelection: () => Selection | undefined
  // adjustPagination: (
  //   position: ViewportNavigationEntry,
  // ) => Observable<`free` | `busy`>
  $: {
    $: Observable<Event>
    layout$: Observable<boolean>
    spineItems$: Observable<SpineItem[]>
    itemsBeforeDestroy$: Observable<void>
  }
}
