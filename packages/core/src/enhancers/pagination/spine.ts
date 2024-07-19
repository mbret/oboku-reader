import {
  Observable,
  debounceTime,
  animationFrameScheduler,
  withLatestFrom,
  map,
  distinctUntilChanged,
  startWith,
} from "rxjs"
import { Reader } from "../../reader"
import { isShallowEqual } from "../../utils/objects"

export const getNumberOfPagesForAllSpineItems = (reader: Reader) =>
  reader.spineItemManager.getAll().map((item) => {
    return reader.spine.spineItemLocator.getSpineItemNumberOfPages({
      spineItem: item,
    })
  }, 0)

export const trackTotalPages = (reader: Reader) => {
  const totalPages$: Observable<{
    numberOfPagesPerItems: number[]
    numberOfTotalPages: number
  }> = reader.spine.$.layout$.pipe(
    debounceTime(10, animationFrameScheduler),
    withLatestFrom(reader.pagination.paginationInfo$),
    map(() => {
      // @todo trigger change to pagination info (+ memo if number is same)
      const numberOfPagesPerItems = getNumberOfPagesForAllSpineItems(reader)

      return {
        numberOfPagesPerItems,
        /**
         * This may be not accurate for reflowable due to dynamic load / unload.
         */
        numberOfTotalPages: numberOfPagesPerItems.reduce(
          (acc, numberOfPagesForItem) => acc + numberOfPagesForItem,
          0,
        ),
      }
    }),
    distinctUntilChanged(isShallowEqual),
    startWith({
      numberOfPagesPerItems: [],
      numberOfTotalPages: 0,
    }),
  )

  return totalPages$
}
