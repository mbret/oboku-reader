import {
  BehaviorSubject,
  Observable,
  Subject,
  animationFrameScheduler,
  delay,
  distinctUntilChanged,
  filter,
  identity,
  map,
  merge,
  mergeMap,
  of,
  pairwise,
  share,
  shareReplay,
  skip,
  startWith,
  switchMap,
  takeUntil,
  tap,
  timer,
  withLatestFrom,
} from "rxjs"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { Context } from "../context/Context"
import { mapKeysTo } from "../utils/rxjs"
import { isShallowEqual } from "../utils/objects"
import { getNewScaledOffset } from "../utils/layout"
import { DestroyableClass } from "../utils/DestroyableClass"
import { Report } from "../report"

const NAMESPACE = `navigation/ViewportNavigator`

const report = Report.namespace(NAMESPACE)

export type ViewportPosition = {
  x: number
  y: number
  __symbol?: `ViewportPosition`
  spineItem?: false
}

export type ViewportNavigationEntry = {
  position: ViewportPosition
  animation?: boolean | "turn" | "snap"
}

export class ViewportNavigator extends DestroyableClass {
  protected navigateSubject = new Subject<ViewportNavigationEntry>()
  protected scrollingSubject = new BehaviorSubject(false)

  public navigating$: Observable<boolean>
  public scrolling$ = this.scrollingSubject.asObservable()
  public layout$: Observable<unknown>

  constructor(
    protected settings: ReaderSettingsManager,
    protected viewportElement$: BehaviorSubject<HTMLElement>,
    protected hookManager: HookManager,
    protected context: Context,
    protected spineElement: BehaviorSubject<HTMLElement>,
  ) {
    super()

    const settingsThatRequireLayout$ = settings.settings$.pipe(
      mapKeysTo([
        `computedPageTurnDirection`,
        `computedPageTurnMode`,
        `numberOfAdjacentSpineItemToPreLoad`,
      ]),
      distinctUntilChanged(isShallowEqual),
    )

    /**
     * Watch for settings update that require changes
     * on this layer.
     *
     * @important
     * Try not to have duplicate with other lower components that also listen to settings change and re-layout
     * on the same settings.
     */
    const updateElementOnSettingsChange$ = merge(
      settingsThatRequireLayout$,
      this.viewportElement$,
    ).pipe(
      withLatestFrom(this.viewportElement$),
      tap(([, element]) => {
        if (settings.settings.computedPageTurnMode === `scrollable`) {
          element.style.removeProperty(`transform`)
          element.style.removeProperty(`transition`)
          element.style.overflow = `scroll`
        } else {
          element.style.removeProperty(`overflow`)
          element.style.removeProperty(`overflowY`)
        }
      }),
    )

    this.layout$ = updateElementOnSettingsChange$.pipe(
      tap(() => {
        report.info(`layout`, settings.settings)
      }),
      share(),
    )

    const navigate$ = this.navigateSubject.pipe(
      filter(
        ({ position }) => !isShallowEqual(position, this.getViewportPosition()),
      ),
      tap((navigation) => {
        // console.log("FOOO", "ViewportController", "navigate", navigation)
      }),
    )

    this.navigating$ = navigate$.pipe(
      map(({ animation, position }) => {
        const shouldAnimate = !(
          !animation ||
          (animation === `turn` &&
            settings.settings.computedPageTurnAnimation === `none`)
        )

        return {
          type: `manualAdjust` as const,
          shouldAnimate,
          animation,
          position,
        }
      }),
      switchMap((currentEvent) => {
        const element = this.viewportElement$.getValue()

        console.log({currentEvent})
        
        // cleanup potential previous manual adjust
        element.style.setProperty(`transition`, `none`)
        element.style.setProperty(`opacity`, `1`)

        return merge(
          of(true),
          of(null).pipe(
            mergeMap(() => {
              if (currentEvent?.type !== `manualAdjust`) return of(false)

              const animationDuration =
                currentEvent.animation === `snap`
                  ? settings.settings.snapAnimationDuration
                  : settings.settings.computedPageTurnAnimationDuration
              const pageTurnAnimation =
                currentEvent.animation === `snap`
                  ? (`slide` as const)
                  : settings.settings.computedPageTurnAnimation

              return of(currentEvent).pipe(
                /**
                 * @important
                 * Optimization:
                 * When the adjustment does not need animation it means we want to be there as fast as possible
                 * One example is when we adjust position after layout. In this case we don't want to have flicker or see
                 * anything for x ms while we effectively adjust. We want it to be immediate.
                 * However when user is repeatedly turning page, we can improve smoothness by delaying a bit the adjustment
                 */
                currentEvent.shouldAnimate
                  ? delay(1, animationFrameScheduler)
                  : identity,
                tap((data) => {
                  const element = this.viewportElement$.getValue()
                  const noAdjustmentNeeded = false

                  if (data.shouldAnimate && !noAdjustmentNeeded) {
                    if (pageTurnAnimation === `fade`) {
                      element.style.setProperty(
                        `transition`,
                        `opacity ${animationDuration / 2}ms`,
                      )
                      element.style.setProperty(`opacity`, `0`)
                    } else if (
                      currentEvent.animation === `snap` ||
                      pageTurnAnimation === `slide`
                    ) {
                      element.style.setProperty(
                        `transition`,
                        `transform ${animationDuration}ms`,
                      )
                      element.style.setProperty(`opacity`, `1`)
                    }
                  } else {
                    element.style.setProperty(`transition`, `none`)
                    element.style.setProperty(`opacity`, `1`)
                  }
                }),
                /**
                 * @important
                 * We always need to adjust the reading offset. Even if the current viewport value
                 * is the same as the payload position. This is because an already running animation could
                 * be active, meaning the viewport is still adjusting itself (after animation duration). So we
                 * need to adjust to anchor to the payload position. This is because we use viewport computed position,
                 * not the value set by `setProperty`
                 */
                tap((data) => {
                  if (pageTurnAnimation !== `fade`) {
                    this.setViewportPosition(data.position)
                  }
                }),
                currentEvent.shouldAnimate
                  ? delay(animationDuration / 2, animationFrameScheduler)
                  : identity,
                tap((data) => {
                  const element = this.viewportElement$.getValue()

                  if (pageTurnAnimation === `fade`) {
                    this.setViewportPosition(data.position)
                    element.style.setProperty(`opacity`, `1`)
                  }
                }),
                currentEvent.shouldAnimate
                  ? delay(animationDuration / 2, animationFrameScheduler)
                  : identity,
                tap((data) => {
                  if (pageTurnAnimation === `fade`) {
                    this.setViewportPosition(data.position)
                  }
                }),
              )
            }),
            map(() => false),
          ),
        )
      }),
      startWith(false),
      shareReplay(1),
    )

    merge(this.navigating$, this.layout$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  /**
   * Programmatically set the viewport position.
   *
   * Usually occurs due to navigation.
   *
   * @see https://stackoverflow.com/questions/22111256/translate3d-vs-translate-performance
   * for remark about flicker / fonts smoothing
   */
  protected setViewportPosition({ x, y }: ViewportPosition) {
    const element = this.viewportElement$.getValue()

    if (this.settings.settings.computedPageTurnMode === `scrollable`) {
      this.scrollingSubject.next(true)
      // @todo use smooth later and adjust the class to avoid false positive
      // @todo see scrollend
      element.scrollTo({ left: x, top: y, behavior: "instant" })

      timer(1)
        .pipe(
          tap(() => {
            this.scrollingSubject.next(false)
          }),
          takeUntil(merge(this.scrollingSubject.pipe(skip(1)), this.destroy$)),
        )
        .subscribe()
    } else {
      /**
       * @important
       * will work automatically with RTL since x will be negative.
       */
      element.style.transform = `translate3d(${-x}px, -${y}px, 0)`
    }

    this.hookManager.execute("onViewportOffsetAdjust", undefined, {})
  }

  navigate(navigation: ViewportNavigationEntry) {
    this.navigateSubject.next(navigation)
  }

  protected getScaledDownPosition({ x, y }: ViewportPosition) {
    const spineElement = this.spineElement.getValue()

    if (!spineElement) throw new Error("Invalid spine element")

    const spineScaleX =
      spineElement.getBoundingClientRect().width / spineElement.offsetWidth

    /**
     * @important
     * we don't use pageSize but viewport clientWidth/height because on some browser (eg: firefox)
     * the scrollbar will take up content space, thus having a reduced pageSize. It will mess up calculation
     * otherwise
     */
    const scaledDownPosition = {
      x: getNewScaledOffset({
        newScale: 1,
        oldScale: spineScaleX,
        screenSize: this.viewportElement$.getValue()?.clientWidth ?? 0,
        pageSize: spineElement.scrollWidth,
        scrollOffset: x,
      }),
      y: getNewScaledOffset({
        newScale: 1,
        oldScale: spineScaleX,
        screenSize: this.viewportElement$.getValue()?.clientHeight ?? 0,
        pageSize: spineElement.scrollHeight,
        scrollOffset: y,
      }),
    }

    return scaledDownPosition
  }

  public getViewportPosition() {
    if (this.settings.settings.computedPageTurnMode === `scrollable`) {
      return this.getScaledDownPosition({
        x: this.viewportElement$.getValue()?.scrollLeft ?? 0,
        y: this.viewportElement$.getValue()?.scrollTop ?? 0,
      })
    }

    /**
     * `x` will be either negative or positive depending on which side we are translating.
     * For example LTR books which translate by moving up will have negative x. The viewport position
     * is not however negative (this is only because of translate). However it can be legit negative
     * for RTL
     */
    const { x, y } = this.viewportElement$
      .getValue()
      ?.getBoundingClientRect() ?? {
      x: 0,
      y: 0,
    }

    const newValue = {
      // we want to round to first decimal because it's possible to have half pixel
      // however browser engine can also gives back x.yyyy based on their precision
      // @see https://stackoverflow.com/questions/13847053/difference-between-and-math-floor for ~~
      x: ~~(x * -1 * 10) / 10,
      // x: ~~(x * 10) / 10,
      y: ~~(Math.abs(y) * 10) / 10,
    }

    return newValue
  }
}
