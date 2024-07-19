import { Reader } from "../../reader"
import { Report } from "../../report"
import { ViewportPosition } from "../../navigation/ViewportNavigator"

export class PanNavigator {
  lastDelta = { x: 0, y: 0 }
  lastPosition: ViewportPosition = { x: 0, y: 0 }
  lastStartPosition: ViewportPosition = { x: 0, y: 0 }
  unlock: ReturnType<Reader["navigation"]["lock"]> | undefined = undefined

  constructor(protected reader: Reader) {}

  moveTo(
    delta: { x: number; y: number } | undefined,
    { final, start }: { start?: boolean; final?: boolean } = {},
  ) {
    if (this.reader.settings.settings.computedPageTurnMode === `scrollable`) {
      Report.warn(`pan control is not available on free page turn mode`)

      return
    }

    const pageTurnDirection =
      this.reader.settings.settings.computedPageTurnDirection

    if (start) {
      this.unlock?.()
      this.unlock = this.reader.navigation.lock()

      // stateSubject$.next(`start`)
      this.lastDelta = { x: 0, y: 0 }
      this.lastStartPosition =
        this.reader.navigation.getCurrentViewportPosition()
      this.lastPosition = this.lastStartPosition
    }

    let navigation = this.reader.navigation.getNavigation().position

    if (delta) {
      /**
       * We floor the delta to avoid having wrong direction derived because of
       * some sub pixel difference due to gesture precision
       */
      const correctedX = Math.floor(delta.x) - (this.lastDelta?.x || 0)
      const correctedY = Math.floor(delta.y) - (this.lastDelta?.y || 0)

      navigation = {
        x: Math.floor(
          pageTurnDirection === `horizontal`
            ? this.lastPosition.x - correctedX
            : 0,
        ),
        y: Math.floor(
          pageTurnDirection === `horizontal`
            ? 0
            : this.lastPosition.y - correctedY,
        ),
      }

      this.lastDelta = delta
    } else {
      navigation = this.lastPosition
    }

    this.lastPosition = navigation

    if (final) {
      this.lastDelta = { x: 0, y: 0 }

      this.reader.navigation.navigate({
        position: navigation,
        animation: false,
      })

      this.unlock?.()

      return
    }

    this.reader.navigation.navigate({
      position: navigation,
      animation: false,
    })
  }
}
