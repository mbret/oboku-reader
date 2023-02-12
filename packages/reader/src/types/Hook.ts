import { Manifest } from "@prose-reader/shared"
import { Observable } from "rxjs"

/**
 * Ideal when your logic only needs to apply something to the item when it's loaded.
 * You can manipulate your item later if you need to update it and trigger a layout.
 * This logic will not run every time there is a layout.
 */
type ItemOnLoadHook = {
  name: `item.onLoad`
  fn: (manipulableFrame: {
    frame: HTMLIFrameElement
    removeStyle: (id: string) => void
    item: Manifest[`spineItems`][number]
    addStyle: (id: string, style: CSSStyleDeclaration[`cssText`]) => void
  }) => (() => void) | Observable<unknown> | void
}

export type Hook =
  | ItemOnLoadHook
  | {
      name: `item.onBeforeContainerCreated`
      fn: (payload: HTMLElement) => HTMLElement
    }
  /**
   * Ideal when your logic needs to apply something to the item chich requires
   * current layout information or is heavily sensitive to context changes.
   * Your logic will run everytime there is a layout triggered.
   */
  | {
      name: `item.onLayoutBeforeMeasurement`
      fn: (payload: {
        frame: {
          getManipulableFrame: () =>
            | undefined
            | {
                removeStyle: (id: string) => void
                addStyle: (id: string, style: CSSStyleDeclaration[`cssText`]) => void
              }
          getViewportDimensions: () =>
            | {
                width: number
                height: number
              }
            | undefined
          isUsingVerticalWriting: () => boolean
          getIsReady: () => boolean
        }
        container: HTMLElement
        item: Manifest[`spineItems`][number]
        minimumWidth: number
        isImageType: () => boolean | undefined
      }) => void
    }
  | {
      /**
       * @todo explain
       */
      name: `item.onAfterLayout`
      fn: (payload: {
        item: Manifest[`spineItems`][number]
        blankPagePosition: `before` | `after` | `none`
        minimumWidth: number
      }) => void
    }
  | {
      name: `item.onGetResource`
      fn: (
        fetchResource: (item: Manifest[`spineItems`][number]) => Promise<Response>
      ) => (item: Manifest[`spineItems`][number]) => Promise<Response>
    }
  /**
   * Only available during reader creation
   */
  | {
      name: `spine.onBeforeContainerCreated`
      fn: (payload: HTMLElement) => HTMLElement
    }
  | {
      name: `viewportNavigator.onBeforeContainerCreated`
      fn: (payload: HTMLElement) => HTMLElement
    }
  | {
      name: `onViewportOffsetAdjust`
      fn: () => void
    }

export interface RegisterHook {
  (name: `item.onBeforeContainerCreated`, fn: Extract<Hook, { name: `item.onBeforeContainerCreated` }>[`fn`]): void
  (name: `item.onGetResource`, fn: Extract<Hook, { name: `item.onGetResource` }>[`fn`]): void
  (name: `item.onLayoutBeforeMeasurement`, fn: Extract<Hook, { name: `item.onLayoutBeforeMeasurement` }>[`fn`]): void
  (name: `item.onAfterLayout`, fn: Extract<Hook, { name: `item.onAfterLayout` }>[`fn`]): void
  (name: `onViewportOffsetAdjust`, fn: Extract<Hook, { name: `onViewportOffsetAdjust` }>[`fn`]): void
  (name: `item.onLoad`, fn: ItemOnLoadHook["fn"]): void
}
