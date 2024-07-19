import { Observable } from "rxjs"
import { Spine } from "./Spine"
import { Pagination } from "../pagination/Pagination"
import { Manifest } from "@prose-reader/shared"
import { SpineItemManager } from "../spineItemManager"
import { Navigator } from "../navigation/Navigator"
import { ComputedCoreSettings, CoreInputSettings } from "../settings/types"
import { Context } from "../context/Context"
import { HookManager } from "../hooks/HookManager"
import { SettingsInterface } from "../settings/SettingsInterface"

export type ContextSettings = Partial<CoreInputSettings>

export type LoadOptions = {
  cfi?: string | null
  containerElement: HTMLElement
}

export type ReaderInternal = {
  context: Context
  spine: Spine
  spineItemManager: SpineItemManager
  navigation: {
    viewportFree$: Navigator["viewportFree$"]
    viewportBusy$: Navigator["viewportBusy$"]
    getCurrentViewportPosition: Navigator["getCurrentViewportPosition"]
    navigate: Navigator["navigate"]
    getNavigation: Navigator["getNavigation"]
    getElement: Navigator["getElement"]
    lock: Navigator["lock"]
    navigationResolver: Navigator["navigationResolver"]
  }
  settings: SettingsInterface<
    CoreInputSettings,
    CoreInputSettings & ComputedCoreSettings
  >
  hookManager: HookManager
  layout: () => void
  load: (manifest: Manifest, loadOptions: LoadOptions) => void
  destroy: () => void
  pagination: {
    paginationInfo$: Pagination["pagination$"]
    getPaginationInfo: Pagination["getPaginationInfo"]
  }
  element$: Observable<HTMLElement>
  $: {
    state$: Observable<{
      supportedPageTurnAnimation: NonNullable<
        ContextSettings[`pageTurnAnimation`]
      >[]
      supportedPageTurnMode: NonNullable<ContextSettings[`pageTurnMode`]>[]
      supportedPageTurnDirection: NonNullable<
        ContextSettings[`pageTurnDirection`]
      >[]
      supportedComputedPageTurnDirection: NonNullable<
        ContextSettings[`pageTurnDirection`]
      >[]
    }>
    /**
     * Dispatched when the reader has loaded a book and is displayed a book.
     * Using navigation API and getting information about current content will
     * have an effect.
     * It can typically be used to hide a loading indicator.
     */
    loadStatus$: Observable<"idle" | "loading" | "ready">
    /**
     * Dispatched when a change in selection happens
     */
    selection$: Observable<{
      toString: () => string
      getAnchorCfi: () => string | undefined
      getFocusCfi: () => string | undefined
    } | null>
    destroy$: Observable<void>
  }
}
