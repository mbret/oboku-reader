import { BehaviorSubject, Observable } from "rxjs"
import { SpineItem } from "../spineItem/createSpineItem"
import { createSelection } from "../selection"
import { createCfiResolver } from "../cfi/cfiResolver"
import { SpineLocationResolver } from "../spine/resolvers/SpineLocationResolver"
import { createSpineItemLocator as createSpineItemLocator } from "../spineItem/locationResolver"

type RequireLayout = boolean
type ManipulableSpineItemCallback = Parameters<
  SpineItem[`manipulateSpineItem`]
>[0]
type ManipulableSpineItemCallbackPayload =
  Parameters<ManipulableSpineItemCallback>[0]
type CfiLocator = ReturnType<typeof createCfiResolver>
type SpineItemLocator = ReturnType<typeof createSpineItemLocator>

type Event = {
  type: `onSelectionChange`
  data: ReturnType<typeof createSelection> | null
}

export type Spine = {
  element$: BehaviorSubject<HTMLElement>
  scrollHeight$: Observable<number>
  getElement: () => HTMLElement | undefined
  locator: SpineLocationResolver
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
