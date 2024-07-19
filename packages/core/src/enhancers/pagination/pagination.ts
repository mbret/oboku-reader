import {
  BehaviorSubject,
  Observable,
  ObservedValueOf,
  combineLatest,
  combineLatestWith,
  distinctUntilChanged,
  map,
  shareReplay,
  tap,
} from "rxjs"
import { getChaptersInfo, trackChapterInfo } from "./chapters"
import {
  EnhancerPaginationInto,
  ExtraPaginationInfo,
  ReaderWithProgression,
} from "./types"
import { isShallowEqual } from "../../utils/objects"
import { trackTotalPages } from "./spine"
import { PaginationInfo } from "../../pagination/Pagination"

export const mapPaginationInfoToExtendedInfo =
  (reader: ReaderWithProgression) =>
  (
    paginationInfo: PaginationInfo,
    chaptersInfo: ObservedValueOf<ReturnType<typeof trackChapterInfo>>,
  ): Omit<
    ExtraPaginationInfo,
    | "beginAbsolutePageIndex"
    | "endAbsolutePageIndex"
    | "beginAbsolutePageIndex"
    | "numberOfTotalPages"
  > => {
    const context = reader.context
    const beginItem =
      paginationInfo.beginSpineItemIndex !== undefined
        ? reader.spineItemManager.get(paginationInfo.beginSpineItemIndex)
        : undefined
    const endItem =
      paginationInfo.endSpineItemIndex !== undefined
        ? reader.spineItemManager.get(paginationInfo.endSpineItemIndex)
        : undefined

    return {
      ...paginationInfo,
      beginChapterInfo: beginItem ? chaptersInfo[beginItem.item.id] : undefined,
      // chapterIndex: number;
      // pages: number;
      // pageIndexInBook: number;
      // pageIndexInChapter: number;
      // pagesOfChapter: number;
      // pagePercentageInChapter: number;
      // offsetPercentageInChapter: number;
      // domIndex: number;
      // charOffset: number;
      // serializeString?: string;
      beginSpineItemReadingDirection: beginItem?.getReadingDirection(),
      endChapterInfo: endItem ? chaptersInfo[endItem.item.id] : undefined,
      endSpineItemReadingDirection: endItem?.getReadingDirection(),
      // spineItemReadingDirection: focusedSpineItem?.getReadingDirection(),
      /**
       * This percentage is based of the weight (kb) of every items and the number of pages.
       * It is not accurate but gives a general good idea of the overall progress.
       * It is recommended to use this progress only for reflow books. For pre-paginated books
       * the number of pages and current index can be used instead since 1 page = 1 chapter.
       */
      percentageEstimateOfBook: endItem
        ? reader.progression.getPercentageEstimate(
            context,
            paginationInfo.endSpineItemIndex ?? 0,
            paginationInfo.endNumberOfPagesInSpineItem,
            paginationInfo.endPageIndexInSpineItem || 0,
            reader.navigation.getCurrentViewportPosition(),
            endItem,
          )
        : 0,
      isUsingSpread: context.state.isUsingSpreadMode ?? false,
      // hasNextChapter: (reader.spine.spineItemIndex || 0) < (manifest.readingOrder.length - 1),
      // hasPreviousChapter: (reader.spine.spineItemIndex || 0) < (manifest.readingOrder.length - 1),
      // numberOfSpineItems: context.manifest?.readingOrder.length,
    }
  }

export const trackPaginationInfo = (reader: ReaderWithProgression) => {
  const chaptersInfo$ = trackChapterInfo(reader)
  const totalPages$ = trackTotalPages(reader)
  const currentValue = new BehaviorSubject<EnhancerPaginationInto>({
    ...reader.pagination.getPaginationInfo(),
    ...mapPaginationInfoToExtendedInfo(reader)(
      reader.pagination.getPaginationInfo(),
      getChaptersInfo(reader),
    ),
    beginAbsolutePageIndex: 0,
    endAbsolutePageIndex: 0,
    numberOfTotalPages: 0,
  })

  const extandedBasePagination$ = reader.pagination.paginationInfo$.pipe(
    combineLatestWith(chaptersInfo$),
    map(([info, chaptersInfo]) => ({
      ...info,
      ...mapPaginationInfoToExtendedInfo(reader)(info, chaptersInfo),
    })),
    distinctUntilChanged(isShallowEqual),
  )

  const paginationInfo$: Observable<EnhancerPaginationInto> = combineLatest([
    extandedBasePagination$,
    totalPages$,
  ]).pipe(
    map(([pageInfo, totalPageInfo]) => ({
      ...pageInfo,
      ...totalPageInfo,
      beginAbsolutePageIndex: totalPageInfo.numberOfPagesPerItems
        .slice(0, pageInfo.beginSpineItemIndex)
        .reduce(
          (acc, numberOfPagesForItem) => acc + numberOfPagesForItem,
          pageInfo.beginPageIndexInSpineItem ?? 0,
        ),
      endAbsolutePageIndex: totalPageInfo.numberOfPagesPerItems
        .slice(0, pageInfo.endSpineItemIndex)
        .reduce(
          (acc, numberOfPagesForItem) => acc + numberOfPagesForItem,
          pageInfo.endPageIndexInSpineItem ?? 0,
        ),
    })),
    tap((value) => {
      currentValue.next(value)
    }),
    shareReplay(1),
  )

  return { paginationInfo$, getPaginationInfo: () => currentValue.value }
}
