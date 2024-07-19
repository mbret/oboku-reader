import { BehaviorSubject, distinctUntilChanged, share, tap } from "rxjs"
import { Context } from "../context/Context"
import { SpineItemManager } from "../spineItemManager"
import { Report } from "../report"
import { isShallowEqual } from "../utils/objects"
import { ViewportPosition } from "../navigation/ViewportNavigator"

const NAMESPACE = `pagination`

const report = Report.namespace(NAMESPACE)

export type PaginationInfo = {
  beginPageIndexInSpineItem: number | undefined
  beginNumberOfPagesInSpineItem: number
  beginCfi: string | undefined
  beginSpineItemIndex: number | undefined
  endPageIndexInSpineItem: number | undefined
  endNumberOfPagesInSpineItem: number
  endCfi: string | undefined
  endSpineItemIndex: number | undefined
  viewportPosition: ViewportPosition
}

export class Pagination {
  protected paginationSubject$ = new BehaviorSubject<PaginationInfo>({
    beginPageIndexInSpineItem: undefined,
    beginNumberOfPagesInSpineItem: 0,
    beginCfi: undefined,
    beginSpineItemIndex: undefined,
    endPageIndexInSpineItem: undefined,
    endNumberOfPagesInSpineItem: 0,
    endCfi: undefined,
    endSpineItemIndex: undefined,
    viewportPosition: { x: 0, y: 0 },
  })

  /**
   * We start emitting pagination information as soon as there is a valid pagination
   */
  public pagination$ = this.paginationSubject$.pipe(
    distinctUntilChanged(isShallowEqual),
    tap((value) => {
      report.info(`pagination`, value)
    }),
    share(),
  )

  constructor(
    protected context: Context,
    protected spineITemManager: SpineItemManager,
  ) {}

  public update = (pagination: Partial<PaginationInfo>) => {
    this.paginationSubject$.next({
      ...this.paginationSubject$.value,
      ...pagination,
    })
  }

  getPaginationInfo() {
    return this.paginationSubject$.value
  }

  destroy() {
    this.paginationSubject$.complete()
  }
}
