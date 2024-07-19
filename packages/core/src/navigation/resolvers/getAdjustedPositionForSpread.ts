import { ViewportPosition } from "../ViewportNavigator"

export const getAdjustedPositionForSpread = ({
  position: { x, y },
  pageSizeWidth,
  visibleAreaRectWidth,
}: {
  position: ViewportPosition
  pageSizeWidth: number
  visibleAreaRectWidth: number
}): ViewportPosition => {
  const isOffsetNotAtEdge = x % visibleAreaRectWidth !== 0
  const correctedX = isOffsetNotAtEdge ? x - pageSizeWidth : x

  return { x: correctedX, y }
}
