import {
  BehaviorSubject,
  Observable,
  distinctUntilChanged,
  filter,
  finalize,
  first,
  identity,
  map,
  merge,
  of,
  share,
  shareReplay,
  skip,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { UserNavigationEntry } from "./UserNavigator"
import {
  ViewportNavigator,
  ViewportPosition,
} from "./viewport/ViewportNavigator"
import { createNavigationResolver } from "./resolvers/NavigationResolver"
import { SpineItemsManager } from "../spine/SpineItemsManager"
import { SpineLocator } from "../spine/locator/SpineLocator"
import { isShallowEqual } from "../utils/objects"
import { Report } from "../report"
import { DestroyableClass } from "../utils/DestroyableClass"
import { Context } from "../context/Context"
import { withRestoredPosition } from "./restoration/withRestoredPosition"
import { mapUserNavigationToInternal } from "./consolidation/mapUserNavigationToInternal"
import { withDirection } from "./consolidation/withDirection"
import { withSpineItemPosition } from "./consolidation/withSpineItemPosition"
import { withFallbackPosition } from "./consolidation/withFallbackPosition"
import { withSpineItemLayoutInfo } from "./consolidation/withSpineItemLayoutInfo"
import { withUrlInfo } from "./consolidation/withUrlInfo"
import { UnsafeSpineItemPosition } from "../spineItem/types"
import { withPaginationInfo } from "./consolidation/withPaginationInfo"
import { withCfiPosition } from "./consolidation/withCfiPosition"
import { withSpineItem } from "./consolidation/withSpineItem"
import { Locker } from "./Locker"

const NAMESPACE = `navigation/InternalNavigator`

const report = Report.namespace(NAMESPACE)

export type NavigationConsolidation = {
  spineItemHeight?: number
  spineItemWidth?: number
  spineItemTop?: number
  spineItemLeft?: number
  spineItemIsUsingVerticalWriting?: boolean
  paginationBeginCfi?: string
  /**
   * Useful for restoration to anchor back at an accurate
   * position in the item. If the item changed its content
   * we cannot assume it's accurate and will need more info.
   */
  positionInSpineItem?: UnsafeSpineItemPosition
  /**
   * Useful in restoration to anchor back to spine item position.
   * Whether we should anchor from bottom or top of the item.
   * Works with `positionInSpineItem`
   *
   * @forward : Used when the user navigate to position only. We will
   * try to restore position starting from begining of item.
   *
   * @backward : Used when the user navigate to position only. We will
   * try to restore position starting from end of item.
   *
   * @anchor : similar to forward but more specific on the intent
   */
  directionFromLastNavigation?: "forward" | "backward" | "anchor"
}

/**
 * Priority of info taken for restoration:
 * - URL
 * - complete cfi
 * - incomplete cfi
 * - spine item position
 * - spine item (fallback)
 */
export type InternalNavigationEntry = {
  position: ViewportPosition
  id: symbol
  meta: {
    triggeredBy: `user` | `restoration` | `pagination`
  }
  type: `api` | `scroll`
  animation?: boolean | `turn` | `snap`
  // direction?: "left" | "right" | "top" | "bottom"
  url?: string | URL
  spineItem?: string | number
  cfi?: string
} & NavigationConsolidation

export type InternalNavigationInput = Omit<
  InternalNavigationEntry,
  "position"
> &
  Partial<InternalNavigationEntry>

export type Navigation = Pick<InternalNavigationEntry, "position" | "id">

export class InternalNavigator extends DestroyableClass {
  /**
   * This position correspond to the current navigation position.
   * This is always sync with navigation and adjustment but IS NOT necessarily
   * synced with current viewport. This is because viewport can be animated.
   * This value may be used to adjust / get current valid info about what should be visible.
   * This DOES NOT reflect necessarily what is visible for the user at instant T.
   */
  public navigationSubject = new BehaviorSubject<InternalNavigationEntry>({
    animation: false,
    position: { x: 0, y: 0 },
    meta: {
      triggeredBy: "user",
    },
    type: "api",
    id: Symbol(),
  })

  public navigated$ = this.navigationSubject.pipe(skip(1))

  public navigation$ = this.navigationSubject.pipe(
    map(({ position, id }) => ({
      position,
      id,
    })),
    distinctUntilChanged(
      (
        { position: previousPosition, ...previousRest },
        { position: currentPosition, ...currentRest },
      ) =>
        isShallowEqual(previousRest, currentRest) &&
        isShallowEqual(previousPosition, currentPosition),
    ),
    shareReplay(1),
  )

  public locker = new Locker()

  constructor(
    protected settings: ReaderSettingsManager,
    protected context: Context,
    protected userNavigation$: Observable<UserNavigationEntry>,
    protected viewportController: ViewportNavigator,
    protected navigationResolver: ReturnType<typeof createNavigationResolver>,
    protected spineItemsManager: SpineItemsManager,
    protected spineLocator: SpineLocator,
    protected element$: Observable<HTMLElement>,
    protected isUserLocked$: Observable<boolean>,
  ) {
    super()

    const layoutHasChanged$ = merge(
      viewportController.layout$,
      spineItemsManager.layout$.pipe(filter((hasChanged) => hasChanged)),
    )

    const navigationFromUser$ = userNavigation$
      .pipe(
        withLatestFrom(this.navigationSubject),
        mapUserNavigationToInternal,
        /**
         * Url lookup is heavier so we start with it to fill
         * as much information as needed to reduce later lookup
         */
        withUrlInfo({
          navigationResolver,
        }),
        /**
         * Cfi lookup is heavier so we start with it to fill
         * as much information as needed to reduce later lookup
         */
        withCfiPosition({
          navigationResolver,
        }),
        withDirection({ context, settings }),
        withSpineItem({
          context,
          navigationResolver,
          settings,
          spineItemsManager,
          spineLocator,
        }),
        withSpineItemPosition({
          context,
          navigationResolver,
          settings,
          spineItemsManager,
          spineLocator,
        }),
        withSpineItemLayoutInfo({
          spineItemsManager,
        }),
      )
      .pipe(
        withFallbackPosition({
          navigationResolver,
          spineItemsManager,
        }),
        withLatestFrom(isUserLocked$),
        switchMap(([params, isUserLocked]) => {
          const shouldNotAlterPosition =
            params.navigation.cfi ||
            params.navigation.url ||
            settings.settings.computedPageTurnMode === "scrollable" ||
            isUserLocked

          return of(params).pipe(
            shouldNotAlterPosition
              ? identity
              : withRestoredPosition({
                  navigationResolver,
                  settings,
                  spineItemsManager,
                  spineLocator,
                  spineItemLocator: spineLocator.spineItemLocator,
                  context,
                }),
          )
        }),
        withSpineItemPosition({
          spineItemsManager,
          spineLocator,
          settings,
          context,
          navigationResolver,
        }),
        map((params) => params.navigation),
        share(),
      )

    const navigationUpdateFollowingUserUnlock$ = navigationFromUser$.pipe(
      withLatestFrom(isUserLocked$),
      filter(([, isUserLocked]) => isUserLocked),
      switchMap(([navigation]) => {
        // @todo emit true/false to keep stream pure
        const unlock = this.locker.lock()

        return isUserLocked$.pipe(
          filter((isUserLocked) => !isUserLocked),
          first(),
          map(
            (): InternalNavigationEntry => ({
              ...navigation,
              animation: "snap" as const,
            }),
          ),
          finalize(() => {
            unlock()
          }),
          takeUntil(navigationFromUser$),
        )
      }),
      share(),
    )

    /**
     * Once a layout change happens we want
     * to validate the navigation. Basically we make sure the current navigation
     * is correct for the current layout.
     *
     * @important
     * We want the restoration to happens as fast as possible so it is invisible for the user.
     * Consider the scenario where an item load / unload and create a shift, we want
     * the user to be restored instantly.
     *
     * This means that if a layout happens during navigation, we will cut it and navigate
     * directly to new position. NO layout should happens during viewport busy.
     * This is responsability of other components.
     */
    const navigationUpateFromLayout$ = layoutHasChanged$.pipe(
      switchMap(() => {
        return of(null).pipe(
          switchMap(() => isUserLocked$.pipe(filter((isLocked) => !isLocked))),
          map(
            (): InternalNavigationEntry => ({
              ...this.navigationSubject.getValue(),
              animation: false,
            }),
          ),
          /**
           * We need to cancel the restoration as soon as there is
           * another navigation. Whether it's user or internal, it means
           * it has been controlled outside.
           */
          takeUntil(
            merge(navigationUpdateFollowingUserUnlock$, navigationFromUser$),
          ),
        )
      }),
    )

    const navigationRestored$ = merge(
      navigationUpateFromLayout$,
      navigationUpdateFollowingUserUnlock$,
    ).pipe(
      map((navigation) => ({ navigation })),
      withRestoredPosition({
        navigationResolver,
        settings,
        spineItemsManager,
        spineLocator,
        spineItemLocator: spineLocator.spineItemLocator,
        context,
      }),
      map((params) => {
        const navigation: InternalNavigationEntry = {
          ...params.navigation,
          meta: {
            triggeredBy: `restoration`,
          },
        }

        return {
          ...params,
          navigation,
        }
      }),
      withSpineItemLayoutInfo({
        spineItemsManager,
      }),
      withSpineItemPosition({
        spineItemsManager,
        spineLocator,
        settings,
        context,
        navigationResolver,
      }),
      map(({ navigation }) => navigation),
      share(),
    )

    // @todo export
    // @todo we should only update the cfi if the content of the
    // item change, because otherwise everytime the viewport get bigger
    // the pagination cfi will change and thus this one too, indfinitely
    // pulling the user baack since we always use the first visible node
    const navigationUpdateOnPaginationUpdate$ =
      context.bridgeEvent.pagination$.pipe(
        withLatestFrom(this.navigationSubject),
        filter(
          ([pagination, navigation]) =>
            pagination.navigationId === navigation.id,
        ),
        map(([pagination, navigation]) => ({
          pagination,
          navigation: {
            ...navigation,
          } satisfies InternalNavigationEntry,
        })),
        withPaginationInfo(),
        distinctUntilChanged(
          (prev, curr) =>
            prev.navigation.paginationBeginCfi ===
            curr.navigation.paginationBeginCfi,
        ),
        map(
          ({ navigation }) =>
            ({
              ...navigation,
              meta: {
                triggeredBy: "pagination",
              },
            }) satisfies InternalNavigationEntry,
        ),
      )

    const navigationUpdate$ = merge(
      navigationRestored$,
      navigationFromUser$,
      navigationUpdateOnPaginationUpdate$,
    )

    const notifyNavigationUpdate = (
      stream: Observable<[InternalNavigationEntry, InternalNavigationEntry]>,
    ) =>
      stream.pipe(
        tap(([currentNavigation, previousNavigation]) => {
          report.info(
            `navigation updated from ${currentNavigation.meta.triggeredBy} of type ${currentNavigation.type}`,
            {
              previousNavigation,
              currentNavigation,
            },
          )

          this.navigationSubject.next(currentNavigation)
        }),
      )

    const navigateViewport = (
      stream: Observable<[InternalNavigationEntry, InternalNavigationEntry]>,
    ) =>
      stream.pipe(
        tap(([currentNavigation, previousNavigation]) => {
          const isScrollFromUser = currentNavigation.type === `scroll`
          const isPaginationUpdate =
            currentNavigation.meta.triggeredBy === "pagination"
          const isRestoration =
            currentNavigation.meta.triggeredBy === "restoration"
          const positionIsSame = isShallowEqual(
            previousNavigation.position,
            currentNavigation.position,
          )

          if (
            (isScrollFromUser && !isRestoration) ||
            isPaginationUpdate ||
            positionIsSame
          )
            return

          this.viewportController.navigate({
            position: currentNavigation.position,
            animation: currentNavigation.animation,
          })
        }),
      )

    navigationUpdate$
      .pipe(
        withLatestFrom(this.navigationSubject),
        /**
         * @important
         *
         * We need to start navigating viewport before notifying navigation
         * change, this is to keep viewportState sync and avoid a "free" ping
         * in between.
         */
        navigateViewport,
        notifyNavigationUpdate,
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  get navigation() {
    return this.navigationSubject.getValue()
  }
}
