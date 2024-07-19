import {
  BehaviorSubject,
  Observable,
  Subject,
  animationFrameScheduler,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  filter,
  finalize,
  first,
  fromEvent,
  map,
  merge,
  of,
  share,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { ViewportPosition } from "./ViewportNavigator"
import { Context } from "../context/Context"
import { Report } from "../report"
import { DestroyableClass } from "../utils/DestroyableClass"

const SCROLL_FINISHED_DEBOUNCE_TIMEOUT = 500
const NAMESPACE = `navigation/UserNavigator`

const report = Report.namespace(NAMESPACE)

export type UserNavigationEntry = {
  position?: ViewportPosition
  spineItem?: number | string
  url?: string | URL
  cfi?: string
  animation?: boolean | "turn" | "snap"
  triggeredBy?: "api" | "scroll"
  /**
   * Useful to be specified when navigating with pan
   * and where a couple of px can go backward for the
   * last navigation (finger release)
   */
  direction?: "left" | "right" | "top" | "bottom"
}

export class UserNavigator extends DestroyableClass {
  /**
   * Navigation from external API.
   *
   * This is the navigation used by navigators and is not necessarily valie.
   * We need to verify and adjust the correct navigation afterward
   */
  protected navigationSubject = new Subject<UserNavigationEntry>()

  protected isLockedSubject = new BehaviorSubject(0)

  public isLocked$ = this.isLockedSubject.pipe(
    map((locked) => !!locked),
    distinctUntilChanged(),
  )

  public unlocked$ = this.isLocked$.pipe(filter((isLocked) => !isLocked))

  public navigation$ = this.navigationSubject.asObservable()

  constructor(
    protected settings: ReaderSettingsManager,
    protected element$: Observable<HTMLElement>,
    protected context: Context,
    protected scrollHappeningFromBrowser$: Observable<unknown>,
  ) {
    super()

    const userScroll$ = element$.pipe(
      switchMap((element) =>
        settings.settings$.pipe(
          map(({ computedPageTurnMode }) => computedPageTurnMode),
          distinctUntilChanged(),
          filter(
            (computedPageTurnMode) => computedPageTurnMode === "scrollable",
          ),
          switchMap(() => {
            return fromEvent(element, `scroll`).pipe(
              withLatestFrom(scrollHappeningFromBrowser$),
              filter(([, shouldAvoidScrollEvent]) => !shouldAvoidScrollEvent),
              map(([event]) => event),
            )
          }),
        ),
      ),
      share(),
    )

    const userScrollEnd$ = userScroll$.pipe(
      exhaustMap(() =>
        userScroll$.pipe(
          debounceTime(
            SCROLL_FINISHED_DEBOUNCE_TIMEOUT,
            animationFrameScheduler,
          ),
        ),
      ),
      share(),
    )

    const lockNavigationWhileScrolling$ = userScroll$.pipe(
      exhaustMap(() => {
        // const unlock = this.lock()

        return userScrollEnd$.pipe(
          take(1),
          finalize(() => {
            // unlock()
          }),
        )
      }),
    )

    /**
     * Update the navigation as the user scroll.
     *
     * Keep it synchronized with scrolling. This should
     * not trigger viewport navigation, only update internal navigation.
     */
    const navigateOnScroll$ = settings.settings$.pipe(
      map(({ computedPageTurnMode }) => computedPageTurnMode),
      distinctUntilChanged(),
      filter((computedPageTurnMode) => computedPageTurnMode === "scrollable"),
      withLatestFrom(element$),
      switchMap(() => userScroll$),
      exhaustMap((event) => {
        const unlock = this.lock()

        return merge(userScroll$, of(event)).pipe(
          debounceTime(
            SCROLL_FINISHED_DEBOUNCE_TIMEOUT,
            animationFrameScheduler,
          ),
          first(),
          tap(() => {
            const element = event.target as HTMLElement

            this.navigate({
              animation: false,
              triggeredBy: "scroll",
              position: {
                x: element.scrollLeft ?? 0,
                y: element.scrollTop ?? 0,
              },
            })
          }),
          finalize(() => {
            unlock()
          }),
        )
      }),
    )

    merge(lockNavigationWhileScrolling$, navigateOnScroll$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  /**
   * Remember that this navigation is not trustable.
   *
   * It needs to be verified and adjusted if necessary before becoming internal.
   */
  navigate(to: UserNavigationEntry) {
    report.info(`.navigate`, to)

    this.navigationSubject.next(to)
  }

  lock() {
    let isCalled = false
    this.isLockedSubject.next(this.isLockedSubject.getValue() + 1)

    return () => {
      if (isCalled) return

      isCalled = true

      this.isLockedSubject.next(this.isLockedSubject.getValue() - 1)
    }
  }
}
