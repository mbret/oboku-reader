import {
  merge,
  filter,
  switchMap,
  withLatestFrom,
  map,
  take,
  Subscription,
  debounceTime,
  animationFrameScheduler,
  tap,
} from "rxjs"
import { Navigator } from "../navigation/Navigator"
import { SpineItemManager } from "../spineItemManager"
import { SpineLocationResolver } from "./resolvers/SpineLocationResolver"
import { Context } from "../context/Context"
import { Report } from "../report"

const NAMESPACE = `SpineItemLoader`
const report = Report.namespace(NAMESPACE)

export class SpineItemLoader {
  protected subs: Subscription[] = []

  constructor(
    protected context: Context,
    protected navigator: Navigator,
    protected spineItemManager: SpineItemManager,
    protected spineLocator: SpineLocationResolver,
  ) {
    /**
     * Loading and unloading content has two important issues that need to be considered
     * - For reflow book it will un-sync the viewport
     * - Loading / unload is CPU intensive.
     *
     * Because of theses two reason we only load/unload when the adjustment is done. This ensure a smooth transition for the second point.
     * For the first point it avoid having content being un-sync while the transition is happening. That way we avoid a new chapter
     * to suddenly being displayed under the transition. The first issue is only a problem for reflow book as paginated will not
     * un-sync the viewport.
     * The flow for the first point is as follow:
     * [navigate] -> [transition] -> [new position] -> [iframe unload/load] -> (eventual adjustment).
     *
     * It would ne nice to be able to load/unload without having to worry about viewport mis-adjustment but due to the current iframe and viewport
     * layout method we have to take it into consideration.
     */
    const loadSpineItems$ = merge(
      /**
       * This one make sure we also listen for layout change and that we execute the code once the navigation
       * has been adjusted (whether it's needed or not).
       */
      this.navigator.navigation$,
      spineItemManager.$.layout$.pipe(filter((hasChanged) => hasChanged)),
    ).pipe(
      // @todo change
      debounceTime(500, animationFrameScheduler),
      switchMap(() => {
        return this.navigator.viewportFree$.pipe(
          take(1),
          withLatestFrom(this.navigator.navigation$),
          map(([, navigation]) => {
            const { position } = navigation
            const { beginIndex = 0, endIndex = 0 } =
              spineLocator.getVisibleSpineItemsFromPosition({
                position,
                threshold: 0,
              }) || {}

            return { beginIndex, endIndex, position }
          }),
        )
      }),
      tap((current) => {
        report.warn(`load request`, current)

        spineItemManager.loadContents([current.beginIndex, current.endIndex])
      }),
    )

    this.subs = [loadSpineItems$.subscribe()]
  }

  public destroy() {
    this.subs.forEach((sub) => sub.unsubscribe())
  }
}
