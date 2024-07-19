export const getItemOffsetFromPageIndex = (
  pageWidth: number,
  pageIndex: number,
  itemWidth: number,
) => {
  const lastPageOffset = itemWidth - pageWidth
  const logicalOffset = (itemWidth * (pageIndex * pageWidth)) / itemWidth

  return Math.max(0, Math.min(lastPageOffset, logicalOffset))
}

export const calculateNumberOfPagesForItem = (
  itemWidth: number,
  pageWidth: number,
) => {
  if ((pageWidth || 0) === 0 || (itemWidth || 0) === 0) return 1
  return Math.floor(Math.max(1, itemWidth / pageWidth))
}

export const getClosestValidOffsetFromApproximateOffsetInPages = (
  offset: number,
  pageWidth: number,
  itemWidth: number,
) => {
  const numberOfPages = calculateNumberOfPagesForItem(itemWidth, pageWidth)
  const offsetValues = [...Array(numberOfPages)].map((_, i) => i * pageWidth)

  if (offset >= numberOfPages * pageWidth)
    return offsetValues[offsetValues.length - 1] || 0

  return (
    offsetValues.find((offsetRange) => offset < offsetRange + pageWidth) || 0
  )
}
