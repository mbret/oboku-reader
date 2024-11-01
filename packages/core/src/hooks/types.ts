import { Manifest } from "@prose-reader/shared"
import { Observable } from "rxjs"

export type UserDestroyFn = () => void | Observable<unknown>

export interface Hook<Name, Params, Result> {
  name: Name
  runFn: (params: Params) => Result
}

export type CoreHook =
  | {
      /**
       * Hook called as soon as the renderer document is created. Not attached to the
       * dom. You can take advantage of this hook to manipulate the document, prepare
       * styles, do some operations, etc.
       */
      name: `item.onDocumentCreated`
      runFn: (params: {
        itemId: string
        layers: { element: HTMLElement }[]
      }) => void
    }
  | {
      /**
       *
       */
      name: `item.onDocumentLoad`
      runFn: (params: {
        destroy$: Observable<void>
        destroy: (fn: UserDestroyFn) => void
        itemId: string
        layers: { element: HTMLElement }[]
      }) => Observable<void> | void
    }
  | {
      name: "item.onBeforeLayout"
      runFn: (params: {
        blankPagePosition: "before" | "after" | "none"
        item: Manifest["spineItems"][number]
        minimumWidth: number
      }) => void
    }
  | {
      name: "item.onAfterLayout"
      runFn: (params: {
        blankPagePosition: "before" | "after" | "none"
        item: Manifest["spineItems"][number]
        minimumWidth: number
      }) => void
    }
  /**
   * before the container of the item is attached to the dom
   */
  | {
      name: "item.onBeforeContainerCreated"
      runFn: (params: { element: HTMLElement }) => void
    }
  | {
      name: "onViewportOffsetAdjust"
      runFn: (params: void) => void
    }
  /**
   * Only available during reader creation
   */
  | {
      name: `navigator.onBeforeContainerCreated`
      runFn: (params: { element: HTMLElement }) => void
    }
// | {
//     name: `item.onGetResource`
//     runFn: (
//       fetchResource: (item: Manifest[`spineItems`][number]) => Promise<Response>,
//     ) => (item: Manifest[`spineItems`][number]) => Promise<Response>
//   }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HookExecution<H extends Hook<any, any, any>> = {
  name: string
  id: string | undefined
  destroyFn: () => Observable<unknown>
  ref: H
}

export type HookFrom<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  H extends Hook<any, any, any>,
  Name extends H["name"],
> = H extends infer HK
  ? HK extends H
    ? HK["name"] extends Name
      ? HK
      : never
    : never
  : never
