import type { InputSettings, OutputSettings } from "./types"
import { SettingsManagerOverload } from "../../settings/SettingsManagerOverload"
import { isShallowEqual } from "../../utils/objects"
import type {
  CoreInputSettings,
  CoreOutputSettings,
} from "../../settings/types"

export class SettingsManager<
  ParentInputSettings extends CoreInputSettings,
  ParentOutputSettings extends CoreOutputSettings,
> extends SettingsManagerOverload<
  InputSettings,
  OutputSettings,
  ParentInputSettings,
  ParentOutputSettings
> {
  computeOutputSettings(inputSettings: InputSettings): InputSettings {
    return inputSettings
  }

  hasSettingsChanged(newOutputSettings: InputSettings): boolean {
    return !isShallowEqual(this.outputSettings, newOutputSettings)
  }

  getCleanedParentInputSettings(
    settings: Partial<InputSettings & ParentInputSettings>,
  ): ParentInputSettings {
    const {
      layoutAutoResize,
      pageHorizontalMargin,
      pageVerticalMargin,
      layoutLayerTransition,
      ...rest
    } = settings

    return rest as unknown as ParentInputSettings
  }

  getDefaultSettings(): InputSettings {
    return {
      layoutAutoResize: "container",
      pageHorizontalMargin: 24,
      pageVerticalMargin: 24,
      layoutLayerTransition: true,
    }
  }
}
