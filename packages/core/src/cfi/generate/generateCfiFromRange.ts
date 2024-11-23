import { Manifest } from "@prose-reader/shared"
import { generateCfi } from "./generateCfi"

/**
 * @todo the package does not support creating for range at the moment @see https://github.com/fread-ink/epub-cfi-resolver/issues/3
 * so we use two cfi for start and end.
 */
export const generateCfiFromRange = (
  {
    startNode,
    start,
    end,
    endNode,
  }: { startNode: Node; start: number; endNode: Node; end: number },
  item: Manifest[`spineItems`][number],
) => {
  const startCFI = generateCfi(startNode, start, item)
  const endCFI = generateCfi(endNode, end, item)

  return { start: startCFI, end: endCFI }
}
