import { Box } from "@chakra-ui/react"
import React from "react"
import { useIsComics } from "../../state"
import { usePagination } from "../state"
import { useReader } from "../useReader"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"

export const PaginationInfoSection = () => {
  const { reader$, reader } = useReader()
  const pagination = usePagination(reader$)
  const settings = useObserve(reader?.settings.settings$ ?? NEVER)
  const [pageIndex, endPageIndex] = [
    (pagination?.beginPageIndexInSpineItem || 0) + 1,
    (pagination?.endPageIndexInSpineItem || 0) + 1
  ].sort((a, b) => a - b)
  const beginAndEndAreDifferent =
    pagination?.beginPageIndexInSpineItem !== pagination?.endPageIndexInSpineItem ||
    pagination?.beginSpineItemIndex !== pagination?.endSpineItemIndex
  const hasOnlyOnePage = pagination?.numberOfTotalPages === 1
  const { numberOfTotalPages } = pagination ?? {}
  const isComic = useIsComics()
  const [absoluteBeginPageIndex = 0, absoluteEndPageIndex = 0] = [
    pagination?.beginAbsolutePageIndex,
    pagination?.endAbsolutePageIndex
  ].sort()

  const isWebtoon = settings?.computedPageTurnDirection === "vertical" && settings.computedPageTurnMode === "scrollable"

  const buildTitleChain = (chapterInfo: NonNullable<typeof pagination>["beginChapterInfo"]): string => {
    if (chapterInfo?.subChapter) {
      return `${chapterInfo.title} / ${buildTitleChain(chapterInfo.subChapter)}`
    }
    return chapterInfo?.title || ""
  }

  const chapterTitle = buildTitleChain(pagination?.beginChapterInfo)

  return (
    <Box>
      <div
        style={{
          color: "white"
        }}
      >
        {`Progression: ${Math.round((pagination?.percentageEstimateOfBook || 0) * 100)}%`}
      </div>
      <Box flex={1}>
        <div
          style={{
            color: "white",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            overflow: "hidden"
          }}
        >
          {chapterTitle ? `Chapter ${chapterTitle}` : ``}
        </div>
      </Box>
      {!isComic && !hasOnlyOnePage && !isWebtoon && (
        <div
          style={{
            color: "white"
          }}
        >
          {beginAndEndAreDifferent && (
            <>{`page ${pageIndex} - ${endPageIndex} of ${pagination?.beginNumberOfPagesInSpineItem}`}</>
          )}
          {!beginAndEndAreDifferent && <>{`page ${pageIndex} of ${pagination?.beginNumberOfPagesInSpineItem}`}</>}
        </div>
      )}
      {(isComic || isWebtoon) && !hasOnlyOnePage && (
        <Box color="white">
          {beginAndEndAreDifferent && (
            <>{`page ${absoluteBeginPageIndex + 1} - ${absoluteEndPageIndex + 1} of ${numberOfTotalPages}`}</>
          )}
          {!beginAndEndAreDifferent && <>{`page ${absoluteBeginPageIndex + 1} of ${numberOfTotalPages}`}</>}
        </Box>
      )}
    </Box>
  )
}
