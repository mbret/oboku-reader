/* eslint-disable @typescript-eslint/no-empty-function */
import { combineLatest, merge } from "rxjs"
import { takeUntil, tap } from "rxjs/operators"
import {
  CoreInputSettings,
  ComputedCoreSettings,
  CoreOutputSettings,
} from "./types"
import { Context } from "../context/Context"
import { areAllItemsPrePaginated } from "../manifest/areAllItemsPrePaginated"
import { Report } from "../report"
import { SettingsManager } from "./SettingsManager"

export class ReaderSettingsManager extends SettingsManager<
  CoreInputSettings,
  CoreOutputSettings
> {
  constructor(
    initialSettings: Partial<CoreInputSettings>,
    protected context: Context,
  ) {
    super(initialSettings)

    const recomputeSettingsOnContextChange$ = combineLatest([
      context.hasVerticalWriting$,
      context.manifest$,
    ]).pipe(
      tap(() => {
        this.update(this.settings)
      }),
    )

    /**
     * Update state based on settings
     */
    const updateContextOnSettingsChanges$ = this.settings$.pipe(
      tap(({ forceSinglePageMode }) => {
        context.update({ forceSinglePageMode })
      }),
    )

    merge(recomputeSettingsOnContextChange$, updateContextOnSettingsChanges$)
      .pipe(takeUntil(context.destroy$))
      .subscribe()
  }

  private getComputedSettings(
    settings: CoreInputSettings,
  ): ComputedCoreSettings {
    const manifest = this.context.manifest
    const hasVerticalWriting = this.context.state.hasVerticalWriting ?? false
    const computedSettings: ComputedCoreSettings = {
      computedPageTurnDirection: settings.pageTurnDirection,
      computedPageTurnAnimation: settings.pageTurnAnimation,
      computedPageTurnMode: `controlled`,
      computedPageTurnAnimationDuration: 0,
    }

    // We force scroll mode for some books
    if (manifest?.renditionFlow === `scrolled-continuous`) {
      computedSettings.computedPageTurnMode = `scrollable`
      computedSettings.computedPageTurnDirection = `vertical`
    } else if (
      manifest &&
      settings.pageTurnMode === `scrollable` &&
      (manifest.renditionLayout !== `pre-paginated` ||
        !areAllItemsPrePaginated(manifest))
    ) {
      Report.warn(
        `pageTurnMode ${settings.pageTurnMode} incompatible with current book, switching back to default`,
      )
      computedSettings.computedPageTurnAnimation = `none`
      computedSettings.computedPageTurnMode = `controlled`
    } else if (settings.pageTurnMode === `scrollable`) {
      computedSettings.computedPageTurnMode = `scrollable`
      computedSettings.computedPageTurnDirection = `vertical`
    }

    // some settings are not available for vertical writing
    if (
      hasVerticalWriting &&
      computedSettings.computedPageTurnAnimation === `slide`
    ) {
      Report.warn(
        `pageTurnAnimation ${computedSettings.computedPageTurnAnimation} incompatible with current book, switching back to default`,
      )
      computedSettings.computedPageTurnAnimation = `none`
    }

    // for now we only support animation none for scrollable
    if (computedSettings.computedPageTurnMode === `scrollable`) {
      computedSettings.computedPageTurnAnimationDuration = 0
      computedSettings.computedPageTurnAnimation = `none`
    } else {
      computedSettings.computedPageTurnAnimationDuration =
        settings.pageTurnAnimationDuration !== undefined
          ? settings.pageTurnAnimationDuration
          // @todo remove
          : 300
    }

    return computedSettings
  }

  getOutputSettings(
    inputSettings: CoreInputSettings,
  ): CoreInputSettings & ComputedCoreSettings {
    const computedSettings = this.getComputedSettings(inputSettings)

    return { ...this.outputSettings, ...inputSettings, ...computedSettings }
  }

  getDefaultSettings() {
    return {
      forceSinglePageMode: false,
      pageTurnAnimation: `none` as const,
      //   computedPageTurnAnimation: `none`,
      pageTurnDirection: `horizontal` as const,
      //   computedPageTurnDirection: `horizontal`,
      pageTurnAnimationDuration: undefined,
      //   computedPageTurnAnimationDuration: 0,
      pageTurnMode: `controlled` as const,
      //   computedPageTurnMode: `controlled`,
      snapAnimationDuration: 300,
      navigationSnapThreshold: 0.3,
      numberOfAdjacentSpineItemToPreLoad: 0,
    }
  }
}
