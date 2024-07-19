import {
  BehaviorSubject,
  EMPTY,
  Observable,
  distinctUntilChanged,
  filter,
  first,
  identity,
  map,
  merge,
  of,
  share,
  shareReplay,
  skip,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { UserNavigationEntry } from "./UserNavigator"
import { ViewportNavigator, ViewportPosition } from "./ViewportNavigator"
import { Pagination } from "../pagination/Pagination"
import { createNavigationResolver } from "./resolvers/NavigationResolver"
import { SpineItemManager } from "../spineItemManager"
import { createSpineLocationResolver } from "../spine/locationResolver"
import { isShallowEqual } from "../utils/objects"
import {
  NavigationConsolidation,
  NavigatorConsolider,
} from "./NavigationConsolider"
import { Report } from "../report"
import { DestroyableClass } from "../utils/DestroyableClass"
import { Context } from "../context/Context"
import { withRestoredPosition } from "./restoration/withRestoredPosition"
import { mapUserNavigationToInternal } from "./consolidation/mapUserNavigationToInternal"
import { withOrGuessDirection } from "./consolidation/withOrGuessDirection"
import { withOrGuessSpineItem as withOrGuessSpineItemInfo } from "./consolidation/withOrGuessSpineItemInfo"
import { withOrGuessPosition } from "./consolidation/withOrGuessPosition"
import { withSpineItemDimensions } from "./consolidation/withSpineItemDimensions"
import { withOrGuessUrlInfo } from "./consolidation/withOrGuessUrlInfo"

const NAMESPACE = `navigation/InternalNavigator`

const report = Report.namespace(NAMESPACE)

/**
 * Priority of info taken for restoration:
 * - complete cfi
 * - URL
 * - incomplete cfi
 * - spine item position
 * - spine item (fallback)
 */
export type InternalNavigationEntry = {
  position: ViewportPosition
  triggeredBy: `user` | `restoration`
  type: `api` | `scroll`
  animation?: boolean | `turn` | `snap`
  direction?: "left" | "right" | "top" | "bottom"
  url?: string | URL
} & NavigationConsolidation

export type InternalNavigationInput = Omit<
  InternalNavigationEntry,
  "position"
> &
  Partial<InternalNavigationEntry>

export type Navigation = Pick<InternalNavigationEntry, "position">

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
    triggeredBy: "user",
    type: "api",
  })

  public navigated$ = this.navigationSubject.asObservable()

  public navigation$ = merge(this.navigationSubject, this.navigated$).pipe(
    startWith(this.navigationSubject.getValue()),
    map(({ position }) => ({
      position,
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

  protected navigatorConsolider: NavigatorConsolider

  constructor(
    protected settings: ReaderSettingsManager,
    protected context: Context,
    protected userNavigation$: Observable<UserNavigationEntry>,
    protected viewportController: ViewportNavigator,
    protected pagination: Pagination,
    protected navigationResolver: ReturnType<typeof createNavigationResolver>,
    protected spineItemManager: SpineItemManager,
    protected spineLocator: ReturnType<typeof createSpineLocationResolver>,
    protected element$: Observable<HTMLElement>,
    protected viewportState$: Observable<"free" | "busy">,
  ) {
    super()

    this.navigatorConsolider = new NavigatorConsolider(
      settings,
      context,
      pagination,
      navigationResolver,
      spineItemManager,
      spineLocator,
    )

    const viewportFree$ = viewportState$.pipe(
      filter((state) => state === "free"),
    )

    const layoutHasChanged$ = merge(
      viewportController.layout$,
      spineItemManager.$.layout$.pipe(filter((hasChanged) => hasChanged)),
    )

    const navigationUpdateFromUser$ = userNavigation$
      .pipe(
        withLatestFrom(this.navigationSubject),
        mapUserNavigationToInternal,
        /**
         * Url lookup is heavier so we start with it to fill
         * as much information as needed to reduce later lookup
         */
        withOrGuessUrlInfo({
          context,
          navigationResolver,
          spineItemManager,
          spineLocator,
        }),
        withOrGuessDirection({ context, settings }),
        withOrGuessSpineItemInfo({
          context,
          navigationResolver,
          settings,
          spineItemManager,
          spineLocator,
        }),
        withSpineItemDimensions({
          spineItemManager,
        }),
        withOrGuessPosition({
          navigationResolver,
          spineItemManager,
        }),
        withLatestFrom(viewportState$),
        switchMap(([params, viewportState]) => {
          const shouldNotAlterPosition =
            settings.settings.computedPageTurnMode === "scrollable" ||
            viewportState === "busy"

          return of(params).pipe(
            shouldNotAlterPosition
              ? identity
              : withRestoredPosition({
                  navigationResolver,
                  settings,
                  spineItemManager,
                  spineLocator,
                  spineItemLocator: spineLocator.spineItemLocator,
                  context,
                }),
          )
        }),
      )
      .pipe(
        map((params) => {
          const finalNavigation =
            this.navigatorConsolider.consolidateNavigation(params)

          return finalNavigation
        }),
        share(),
      )

    const navigationUpdateAfterUnlocked$ = navigationUpdateFromUser$.pipe(
      switchMap((navigation) => {
        return viewportState$.pipe(
          first(),
          switchMap((state) => {
            return state === "free"
              ? EMPTY
              : viewportFree$.pipe(
                  first(),
                  map((): InternalNavigationEntry => {
                    return {
                      ...navigation,
                      animation: "turn" as const,
                    }
                  }),
                )
          }),
        )
      }),
    )

    /**
     * Once a layout change happens or a navigation occurs we want
     * to validate the navigation. Basically we make sure the current navigation
     * is correct for the current layout. Navigation can be incorrect due to
     * 2 scenarios:
     *
     * - navigation was user based and incorrect from the start
     * - navigation was correct but became incorrect due to layout shift
     *
     * @important
     * We want the restoration to happens as fast as possible so it is invisible for the user.
     * Consider the scenario where an item load / unload and create a shift, we want
     * the user to be restored instantly.
     */
    const navigationUpateFromLayout$ = layoutHasChanged$.pipe(
      switchMap(() => {
        return viewportFree$.pipe(take(1)).pipe(
          map(() => {
            const navigation: InternalNavigationEntry = {
              ...this.navigationSubject.getValue(),
              animation: false,
            }

            return navigation
          }),
          /**
           * We need to cancel the restoration as soon as there is
           * another navigation. Whether it's user or internal, it means
           * it has been controlled outside.
           */
          takeUntil(this.navigationSubject.pipe(skip(1))),
        )
      }),
    )

    const navigationFromRestore$ = merge(
      navigationUpateFromLayout$,
      navigationUpdateAfterUnlocked$,
    ).pipe(
      map((navigation) => ({ navigation })),
      withRestoredPosition({
        navigationResolver,
        settings,
        spineItemManager,
        spineLocator,
        spineItemLocator: spineLocator.spineItemLocator,
        context,
      }),
      map((params) => {
        const navigation: InternalNavigationEntry = {
          ...params.navigation,
          triggeredBy: `restoration`,
        }

        return {
          ...params,
          navigation,
        }
      }),
      withSpineItemDimensions({
        spineItemManager,
      }),
      withLatestFrom(this.navigationSubject),
      map(([params, previousNavigation]) =>
        this.navigatorConsolider.consolidateNavigation({
          previousNavigation,
          navigation: params.navigation,
          trackDirection: false,
        }),
      ),
    )

    const navigationUpdate$ = merge(
      navigationFromRestore$,
      navigationUpdateFromUser$,
    )

    const registerNavigationUpdate$ = navigationUpdate$.pipe(
      withLatestFrom(this.navigationSubject),
      tap(([currentNavigation, previousNavigation]) => {
        this.navigationSubject.next(currentNavigation)

        report.info(
          `navigation updated from ${currentNavigation.triggeredBy} of type ${currentNavigation.type}`,
          {
            previousNavigation,
            currentNavigation,
          },
        )
      }),
    )

    const navigateViewportOnNavigation$ = registerNavigationUpdate$.pipe(
      tap(([currentNavigation]) => {
        /**
         * If the navigation is a scroll, the viewport
         * is already updated by the browser
         */
        if (
          currentNavigation.type === `scroll` &&
          currentNavigation.triggeredBy !== "restoration"
        )
          return

        this.viewportController.navigate(currentNavigation)
      }),
    )

    navigateViewportOnNavigation$.pipe(takeUntil(this.destroy$)).subscribe()
  }

  get navigation() {
    return this.navigationSubject.getValue()
  }
}
