import { CFI } from "./cfi/cfi"
import { Manifest } from "./types"

export const createSelection = (
  selection: Selection,
  item: Manifest[`spineItems`][number],
) => {
  const text = selection.toString()

  return {
    toString: () => text,
    getAnchorCfi: () => {
      if (selection.anchorNode) {
        return CFI.generate(
          selection.anchorNode,
          selection.anchorOffset,
          `|[prose~anchor~${encodeURIComponent(item.id)}]`,
        )
      }
    },
    getFocusCfi: () => {
      if (selection.focusNode) {
        return CFI.generate(
          selection.focusNode,
          selection.focusOffset,
          `|[prose~anchor~${encodeURIComponent(item.id)}]`,
        )
      }
    },
  }
}
