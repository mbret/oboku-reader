import { Context } from "../context/Context"
import { Pagination } from "../pagination/Pagination"
import { SpineItemManager } from "../spineItemManager"
import { SpineLocationResolver } from "../spine/resolvers/SpineLocationResolver"
import { createNavigationResolver } from "./resolvers/NavigationResolver"
import { BehaviorSubject, combineLatest, merge, of, timer } from "rxjs"
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  withLatestFrom,
} from "rxjs/operators"
import { createCfiResolver } from "../cfi/cfiResolver"
import { Spine } from "../spine/createSpine"
import { isDefined } from "../utils/isDefined"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { noopElement } from "../utils/dom"
import { ViewportNavigator } from "./ViewportNavigator"
import { UserNavigator } from "./UserNavigator"
import { InternalNavigator } from "./InternalNavigator"
import { HTML_PREFIX } from "../constants"

export const createViewportNavigator = ({
  spineItemManager,
  context,
  pagination,
  parentElement$,
  cfiLocator,
  spineLocator,
  hookManager,
  spine,
  settings,
}: {
  spineItemManager: SpineItemManager
  pagination: Pagination
  context: Context
  parentElement$: BehaviorSubject<HTMLElement | undefined>
  cfiLocator: ReturnType<typeof createCfiResolver>
  spineLocator: SpineLocationResolver
  hookManager: HookManager
  spine: Spine
  settings: ReaderSettingsManager
}) => {
  const element$ = new BehaviorSubject<HTMLElement>(noopElement())
  const navigationResolver = createNavigationResolver({
    context,
    settings,
    spineItemManager,
    cfiLocator,
    locator: spineLocator,
  })

  const viewportNavigator = new ViewportNavigator(
    settings,
    element$,
    hookManager,
    context,
    spine.element$,
  )

  const scrollHappeningFromBrowser$ = combineLatest([
    merge(spine.scrollHeight$, spineItemManager.itemResize$).pipe(
      switchMap(() => merge(of(true), timer(10).pipe(map(() => false)))),
      startWith(false),
    ),
    viewportNavigator.scrolling$,
  ]).pipe(
    map(([layouting, scrolling]) => layouting || scrolling),
    shareReplay(1),
  )

  const userNavigator = new UserNavigator(
    settings,
    element$,
    context,
    scrollHappeningFromBrowser$,
  )

  const viewportState$ = combineLatest([
    viewportNavigator.navigating$,
    userNavigator.isLocked$,
  ]).pipe(
    map((states) => (states.some((isLocked) => isLocked) ? `busy` : `free`)),
    distinctUntilChanged(),
    shareReplay(1),
  )

  const internalNavigator = new InternalNavigator(
    settings,
    context,
    userNavigator.navigation$,
    viewportNavigator,
    pagination,
    navigationResolver,
    spineItemManager,
    spineLocator,
    element$,
    viewportState$,
  )

  const parentElementSub = parentElement$
    .pipe(filter(isDefined), withLatestFrom(spine.element$))
    .subscribe(([parentElement, spineElement]) => {
      const element: HTMLElement =
        parentElement.ownerDocument.createElement(`div`)
      element.style.cssText = `
      height: 100%;
      position: relative;
    `
      element.className = `${HTML_PREFIX}-navigator`

      /**
       * Beware of this property, do not try to change anything else or remove it.
       * This is early forced optimization and is used for this specific context.
       * @see https://developer.mozilla.org/en-US/docs/Web/CSS/will-change
       *
       * @important
       * This seems to be responsible for the screen freeze issue
       */
      // element.style.willChange = `transform`
      // element.style.transformOrigin = `0 0`

      hookManager.execute("navigator.onBeforeContainerCreated", undefined, {
        element,
      })

      element.appendChild(spineElement)

      parentElement.appendChild(element)

      element$.next(element)
    })

  const destroy = () => {
    userNavigator.destroy()
    viewportNavigator.destroy()
    internalNavigator.destroy()
    parentElementSub.unsubscribe()
  }

  return {
    destroy,
    getNavigation: () => internalNavigator.navigation,
    internalNavigator,
    getCurrentViewportPosition:
      viewportNavigator.getViewportPosition.bind(viewportNavigator),
    element$,
    isLocked$: userNavigator.isLocked$,
    unlocked$: userNavigator.unlocked$,
    viewportState$,
    viewportFree$: viewportState$.pipe(filter((state) => state === "free")),
    viewportBusy$: viewportState$.pipe(filter((state) => state === "busy")),
    navigate: userNavigator.navigate.bind(userNavigator),
    lock: userNavigator.lock.bind(userNavigator),
    navigationResolver: navigationResolver,
    navigation$: internalNavigator.navigation$,
    getElement: () => element$.getValue(),
  }
}

export type Navigator = ReturnType<typeof createViewportNavigator>
