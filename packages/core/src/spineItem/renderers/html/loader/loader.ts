import { BehaviorSubject, merge, NEVER, of, Subject } from "rxjs"
import {
  exhaustMap,
  filter,
  share,
  takeUntil,
  tap,
  switchMap,
  first,
  map,
  distinctUntilChanged,
  withLatestFrom,
  endWith,
  ignoreElements,
  startWith,
  defaultIfEmpty,
} from "rxjs/operators"
import { loadFrame } from "./loadFrame"
import { unloadFrame } from "./unloadFrame"
import { waitForFrameReady } from "./waitForFrameReady"
import { ReaderSettingsManager } from "../../../../settings/ReaderSettingsManager"
import { HookManager } from "../../../../hooks/HookManager"
import { Context } from "../../../../context/Context"
import { Manifest } from "@prose-reader/shared"
import { ResourceHandler } from "../../../ResourceHandler"

export const createLoader = ({
  item,
  parent,
  context,
  settings,
  hookManager,
  stateSubject,
  resourcesHandler,
}: {
  item: Manifest[`spineItems`][number]
  parent: HTMLElement
  context: Context
  settings: ReaderSettingsManager
  hookManager: HookManager
  stateSubject: BehaviorSubject<
    "unloading" | "idle" | "loading" | "loaded" | "ready"
  >
  resourcesHandler: ResourceHandler
}) => {
  const destroySubject$ = new Subject<void>()
  const loadSubject = new Subject<void>()
  const unloadSubject = new Subject<void>()
  const frameElementSubject = new BehaviorSubject<
    HTMLIFrameElement | undefined
  >(undefined)

  const unloadFrame$ = unloadSubject.pipe(
    withLatestFrom(stateSubject),
    filter(([, state]) => state !== "unloading" && state !== "idle"),
    exhaustMap(() =>
      context.bridgeEvent.viewportFree$.pipe(
        first(),
        switchMap(() =>
          unloadFrame({
            hookManager,
            item,
            frameElement: frameElementSubject.getValue(),
            context,
          }),
        ),
        tap(() => {
          frameElementSubject.next(undefined)
        }),
        ignoreElements(),
        startWith("loading" as const),
        endWith("success" as const),
        defaultIfEmpty("idle" as const),
      ),
    ),
    startWith("idle" as const),
    distinctUntilChanged(),
    share(),
  )

  const unloaded$ = unloadFrame$.pipe(filter((state) => state === "success"))
  const unloading$ = unloadFrame$.pipe(filter((state) => state === "loading"))

  const loadFrame$ = loadSubject.pipe(
    exhaustMap(() => {
      const preventFurtherLoad$ = NEVER

      return merge(
        preventFurtherLoad$,
        context.bridgeEvent.viewportFree$.pipe(
          first(),
          switchMap(() =>
            loadFrame({
              element: parent,
              hookManager,
              item,
              onFrameElement: (element) => {
                frameElementSubject.next(element)
              },
              settings,
              context,
              resourcesHandler
            }),
          ),
          map((frame) => ({ state: "success" as const, frame })),
          startWith({ state: "loading" as const }),
          defaultIfEmpty({ state: "idle" as const }),
        ),
      ).pipe(takeUntil(unloaded$))
    }),
    startWith({ state: "idle" as const }),
    share(),
  )

  const loading$ = loadFrame$.pipe(filter(({ state }) => state === "loading"))
  const loaded$ = loadFrame$.pipe(
    filter((state) => state.state === "success"),
    map(({ frame }) => frame),
  )

  const frameIsReady$ = loaded$.pipe(
    switchMap((frame) =>
      of(frame).pipe(waitForFrameReady, takeUntil(unloadSubject)),
    ),
    share(),
  )

  const state$ = merge(
    unloaded$.pipe(map(() => "idle" as const)),
    unloading$.pipe(map(() => "unloading" as const)),
    loaded$.pipe(map(() => "loaded" as const)),
    loading$.pipe(map(() => "loading" as const)),
    frameIsReady$.pipe(map(() => "ready" as const)),
  ).pipe(tap((state) => stateSubject.next(state)))

  const stateSub = state$.pipe(takeUntil(destroySubject$)).subscribe()

  return {
    load: () => loadSubject.next(),
    unload: () => unloadSubject.next(),
    destroy: () => {
      unloadSubject.next()
      unloadSubject.complete()
      loadSubject.complete()
      frameElementSubject.complete()
      destroySubject$.next()
      destroySubject$.complete()
      stateSub.unsubscribe()
    },
    get element() {
      return frameElementSubject.getValue()
    },
    element$: frameElementSubject.asObservable(),
  }
}
