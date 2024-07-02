import { createSelection } from "./selection"

export type { Manifest } from "./types"

import { createReaderWithEnhancers as createReader } from "./createReaderWithEnhancer"

export { HookManager } from "./hooks/HookManager"

export { SettingsManager } from "./settings/SettingsManager"

export type Reader = ReturnType<typeof createReader>

export { createReader }

export type ReaderSelection = ReturnType<typeof createSelection>

export { Report } from "./report"

export { groupBy, isShallowEqual } from "./utils/objects"
