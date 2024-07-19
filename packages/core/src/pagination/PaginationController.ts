import {
  animationFrameScheduler,
  filter,
  merge,
  switchMap,
  take,
  takeUntil,
  tap,
  timer,
  withLatestFrom,
} from "rxjs"
import { Context } from "../context/Context"
import { Navigator } from "../navigation/Navigator"
import { Pagination } from "./Pagination"
import { SpineItemManager } from "../spineItemManager"
import { Spine } from "../types/Spine"
import { DestroyableClass } from "../utils/DestroyableClass"
import { createSpineItemLocator } from "../spineItem/locationResolver"

export class PaginationController extends DestroyableClass {
  constructor(
    protected context: Context,
    protected navigator: Navigator,
    protected pagination: Pagination,
    protected spineItemManager: SpineItemManager,
    protected spine: Spine,
    protected spineItemlocationResolver: ReturnType<
      typeof createSpineItemLocator
    >,
  ) {
    super()

    /**
     * Adjust heavier pagination once the navigation and items are updated.
     * This is also cancelled if the layout changes, because the layout will
     * trigger a new navigation adjustment and pagination again.
     *
     * This adjustment is used to update the pagination with the most up to date values we can.
     * It needs to be ran only when viewport is free because some operation such as looking up cfi can
     * be really heavy.
     *
     * The cfi will only be updated if it needs to be:
     * - cfi is a root target
     * - cfi is undefined
     * - items are different
     */
    const updatePagination$ = merge(
      this.navigator.navigation$,
      spineItemManager.$.layout$.pipe(filter((hasChanged) => hasChanged)),
    ).pipe(
      switchMap(() => {
        /**
         * @important
         *
         * It's important to soft update pagination immediatly.
         * This will avoid delay in potential user feedbacks (navigation buttons).
         *
         * However we wait for the navigator to be unlocked, this avoid updating the pagination
         * while the user is panning for exemple. We consider a locked navigator as unfinished
         * navigation.
         *
         * Nothing here should be heavier than layout lookup.
         */
        return this.navigator.unlocked$.pipe(
          take(1),
          withLatestFrom(this.navigator.navigation$),
          tap(([, navigation]) => {
            const { position } = navigation

            const {
              beginIndex: beginSpineItemIndex,
              endIndex: endSpineItemIndex,
            } =
              this.spine.locator.getVisibleSpineItemsFromPosition({
                position,
                threshold: 0.5,
              }) ?? {}

            // if (
            //   beginSpineItemIndex === undefined ||
            //   endSpineItemIndex === undefined
            // )
            //   return

            const beginSpineItem =
              this.spineItemManager.get(beginSpineItemIndex)
            const endSpineItem = this.spineItemManager.get(endSpineItemIndex)

            if (!beginSpineItem || !endSpineItem) return

            const beginLastCfi = this.pagination.getPaginationInfo().beginCfi
            const endLastCfi = this.pagination.getPaginationInfo().endCfi

            const { beginPageIndex = 0 } =
              this.spine.locator.getVisiblePagesFromViewportPosition({
                spineItem: beginSpineItem,
                position,
                threshold: 0.5,
              }) ?? {}

            const { endPageIndex = 0 } =
              this.spine.locator.getVisiblePagesFromViewportPosition({
                spineItem: endSpineItem,
                position,
                threshold: 0.5,
              }) ?? {}

            const shouldUpdateBeginCfi =
              this.pagination.getPaginationInfo().beginSpineItemIndex !==
                beginSpineItemIndex ||
              beginLastCfi === undefined ||
              this.spine.cfiLocator.isRootCfi(beginLastCfi)

            const shouldUpdateEndCfi =
              this.pagination.getPaginationInfo().endSpineItemIndex !==
                endSpineItemIndex ||
              endLastCfi === undefined ||
              this.spine.cfiLocator.isRootCfi(endLastCfi)

            const beginCfi = shouldUpdateBeginCfi
              ? this.spine.cfiLocator.getRootCfi(beginSpineItem)
              : beginLastCfi

            const endCfi = shouldUpdateEndCfi
              ? this.spine.cfiLocator.getRootCfi(endSpineItem)
              : endLastCfi

            const beginNumberOfPagesInSpineItem =
              this.spineItemlocationResolver.getSpineItemNumberOfPages({
                spineItem: beginSpineItem,
              })

            const endNumberOfPagesInSpineItem =
              this.spineItemlocationResolver.getSpineItemNumberOfPages({
                spineItem: endSpineItem,
              })

            this.pagination.update({
              beginCfi,
              beginNumberOfPagesInSpineItem,
              beginPageIndexInSpineItem: beginPageIndex,
              beginSpineItemIndex,
              endCfi,
              endNumberOfPagesInSpineItem,
              endPageIndexInSpineItem: endPageIndex,
              endSpineItemIndex,
              viewportPosition: navigation.position,
            })
          }),
        )
      }),
    )

    /**
     * Heavy operation, needs to be optimized as much as possible.
     *
     * @todo add more optimisation, comparing item before, after with position, etc
     */
    const updateCfi$ = updatePagination$.pipe(
      switchMap(() => this.navigator.viewportState$),
      filter((state) => state === "free"),
      switchMap(() => timer(500, animationFrameScheduler)),
      tap(() => {
        const {
          beginSpineItemIndex,
          endSpineItemIndex,
          beginPageIndexInSpineItem,
          endPageIndexInSpineItem,
        } = this.pagination.getPaginationInfo()

        if (
          beginPageIndexInSpineItem === undefined ||
          endPageIndexInSpineItem === undefined ||
          beginSpineItemIndex === undefined ||
          endSpineItemIndex === undefined
        )
          return

        const beginSpineItem = this.spineItemManager.get(beginSpineItemIndex)
        const endSpineItem = this.spineItemManager.get(endSpineItemIndex)

        if (beginSpineItem === undefined || endSpineItem === undefined) return

        this.pagination.update({
          beginCfi: this.spine.cfiLocator.getCfi(
            beginPageIndexInSpineItem,
            beginSpineItem,
          ),
          endCfi: this.spine.cfiLocator.getCfi(
            endPageIndexInSpineItem,
            endSpineItem,
          ),
        })
      }),
    )

    merge(updatePagination$, updateCfi$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }
}
