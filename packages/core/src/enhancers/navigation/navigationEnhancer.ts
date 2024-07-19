import {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "../types/enhancer"
import { ManualNavigator } from "./manualNavigator"
import { PanNavigator } from "./panNavigator"
import { observeState } from "./state"
import { NavigationEnhancerOutput } from "./types"
import { Manifest } from "@prose-reader/shared"
import { LoadOptions } from "../../types/reader"

export const navigationEnhancer =
  <
    InheritOptions extends EnhancerOptions<RootEnhancer>,
    InheritOutput extends EnhancerOutput<RootEnhancer>,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & NavigationEnhancerOutput => {
    const reader = next(options)

    const state$ = observeState(reader)

    const manualNavigator = new ManualNavigator(reader)
    const panNavigator = new PanNavigator(reader)

    const load = (manifest: Manifest, loadOptions: LoadOptions) => {
      reader.load(manifest, loadOptions)

      if (loadOptions.cfi) {
        manualNavigator.goToCfi(loadOptions.cfi, { animate: false })
      }
    }

    return {
      ...reader,
      load,
      navigation: {
        ...reader.navigation,
        state$,
        moveTo: panNavigator.moveTo.bind(panNavigator),
        turnLeft: manualNavigator.turnLeft.bind(manualNavigator),
        turnRight: manualNavigator.turnRight.bind(manualNavigator),
        goToCfi: manualNavigator.goToCfi.bind(manualNavigator),
        goToUrl: manualNavigator.goToUrl.bind(manualNavigator),
        goToSpineItem: manualNavigator.goToSpineItem.bind(manualNavigator),
        goToTopSpineItem:
          manualNavigator.goToTopSpineItem.bind(manualNavigator),
        goToBottomSpineItem:
          manualNavigator.goToBottomSpineItem.bind(manualNavigator),
        goToLeftSpineItem:
          manualNavigator.goToLeftSpineItem.bind(manualNavigator),
        goToRightSpineItem:
          manualNavigator.goToRightSpineItem.bind(manualNavigator),
        goToPageOfCurrentChapter:
          manualNavigator.goToPageOfCurrentChapter.bind(manualNavigator),
      },
    }
  }
