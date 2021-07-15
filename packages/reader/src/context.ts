import { BehaviorSubject, Subject } from "rxjs"
import { Report } from "./report"
import { LoadOptions, Manifest } from "./types"

export type Context = ReturnType<typeof createContext>

export type ContextObservableEvents = {}

type Settings = {
  forceSinglePageMode: boolean,
  pageTurnAnimation: `none` | `fade` | `slide`,
  pageTurnAnimationDuration: undefined | number
  pageTurnDirection: `vertical` | `horizontal`,
  pageTurnMode: `controlled` | `free`,
}

export const createContext = (initialSettings: Partial<Settings>) => {
  let manifest: Manifest | undefined
  let loadOptions: LoadOptions | undefined
  let settings: Settings = {
    forceSinglePageMode: false,
    pageTurnAnimation: `none`,
    pageTurnDirection: `horizontal`,
    pageTurnAnimationDuration: undefined,
    pageTurnMode: `controlled`,
    ...initialSettings
  }
  let computedPageTurnMode = settings.pageTurnMode
  let computedPageTurnAnimationDuration = settings.pageTurnAnimationDuration || 0
  const settings$ = new BehaviorSubject(settings)
  const subject = new Subject<ContextObservableEvents>()
  const loadSubject$ = new Subject()
  const visibleAreaRect = {
    width: 0,
    height: 0,
    x: 0,
    y: 0
  }
  const horizontalMargin = 24
  const verticalMargin = 20
  const marginTop = 0
  const marginBottom = 0
  const destroy$ = new Subject<void>()

  const updateComputedSettings = (newManifest: Manifest | undefined, newSettings: Settings) => {
    if (computedPageTurnMode === `free` && newManifest?.renditionLayout !== `pre-paginated`) {
      Report.warn(`pageTurnMode incompatible with current book, switching back to controlled mode`)
      computedPageTurnMode = `controlled`
    }

    computedPageTurnAnimationDuration = newSettings.pageTurnAnimationDuration !== undefined
      ? newSettings.pageTurnAnimationDuration
      : 300
  }

  /**
   * Global spread behavior
   * @see http://idpf.org/epub/fxl/#property-spread
   * @todo user setting
   */
  const shouldDisplaySpread = () => {
    const { height, width } = visibleAreaRect
    const isLandscape = width > height

    if (settings.forceSinglePageMode) return false

    // portrait only
    if (!isLandscape && manifest?.renditionSpread === `portrait`) {
      return true
    }

    // default auto behavior
    return (isLandscape && (manifest?.renditionSpread === undefined || manifest?.renditionSpread === `auto` || manifest?.renditionSpread === `landscape` || manifest?.renditionSpread === `both`))
  }

  const load = (newManifest: Manifest, newLoadOptions: LoadOptions) => {
    manifest = newManifest
    loadOptions = newLoadOptions

    updateComputedSettings(newManifest, settings)

    loadSubject$.next()
  }

  /**
   * RTL only makes sense for horizontal scrolling
   */
  const isRTL = () => {
    return manifest?.readingDirection === 'rtl'
    // return true
  }

  const setSettings = (newSettings: Partial<typeof settings>) => {
    settings = { ...settings, ...newSettings }

    updateComputedSettings(manifest, settings)

    settings$.next(settings)
  }

  const getSettings = () => settings

  settings$.next(settings)

  const destroy = () => {
    subject.complete()
    settings$.complete()
    loadSubject$.complete()
    destroy$.next()
    destroy$.complete()
  }

  return {
    load,
    isRTL,
    destroy,
    getLoadOptions: () => loadOptions,
    setSettings,
    getSettings,
    getCalculatedInnerMargin: () => 0,
    getVisibleAreaRect: () => visibleAreaRect,
    getComputedPageTurnMode: () => computedPageTurnMode,
    getComputedPageTurnAnimationDuration: () => computedPageTurnAnimationDuration,
    shouldDisplaySpread,
    setVisibleAreaRect: (
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      // visibleAreaRect.width = width - horizontalMargin * 2
      visibleAreaRect.width = width
      visibleAreaRect.height = height - marginTop - marginBottom
      visibleAreaRect.x = x
      visibleAreaRect.y = y

      // if (this.useChromiumRubyBugSafeInnerMargin) {
      //   this.visibleAreaRect.height =
      //     this.visibleAreaRect.height - this.getCalculatedInnerMargin()
      // }
    },
    getHorizontalMargin: () => horizontalMargin,
    getVerticalMargin: () => verticalMargin,
    getPageSize: () => {
      return {
        width: shouldDisplaySpread()
          ? visibleAreaRect.width / 2
          : visibleAreaRect.width,
        height: visibleAreaRect.height,
      }
    },
    $: {
      $: subject.asObservable(),
      destroy$: destroy$.asObservable(),
      settings$: settings$.asObservable(),
      load$: loadSubject$.asObservable()
    },
    getManifest: () => manifest,
    getReadingDirection: () => manifest?.readingDirection
  }
}