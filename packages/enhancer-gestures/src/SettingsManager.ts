import { SettingsManager } from "@prose-reader/core"
import { InputSettings, OutputSettings } from "./types"

export class GesturesSettingsManager extends SettingsManager<InputSettings, OutputSettings> {
  getOutputSettings(inputSettings: InputSettings): InputSettings {
    return inputSettings
  }

  getDefaultSettings(): InputSettings {
    return {
      panNavigation: "pan",
    }
  }
}
