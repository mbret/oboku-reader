import { Manifest } from "@prose-reader/shared"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { BehaviorSubject } from "rxjs"

type Layer = {
  element: Element
}

export abstract class Renderer {
  protected stateSubject = new BehaviorSubject<
    `idle` | `loading` | `loaded` | `unloading` | `ready`
  >(`idle`)

  constructor(
    protected context: Context,
    protected settings: ReaderSettingsManager,
    protected hookManager: HookManager,
    protected item: Manifest[`spineItems`][number],
    protected containerElement: HTMLElement,
  ) {}

  abstract render(params: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }): { width: number; height: number }

  /**
   * Detect the type of resource (independently of rendition flow).
   * If an image is detected for reflowable for example we may want to display
   * things accordingly.
   */
  abstract isImageType(): boolean

  abstract load(): void
  abstract unload(): void

  abstract getViewPortInformation():
    | {
        computedScale: number
        computedWidthScale: number
        viewportDimensions: {
          width: number
          height: number
        }
      }
    | undefined

  abstract destroy(): void

  abstract get writingMode(): `vertical-rl` | `horizontal-tb` | undefined
  abstract get readingDirection(): `rtl` | `ltr` | undefined

  public get state$() {
    return this.stateSubject
  }

  abstract get layers(): Layer[]
}