import { BehaviorSubject, merge, Observable } from "rxjs"
import { share, switchMap, takeUntil, tap } from "rxjs/operators"
import { Context } from "../context/Context"
import { Pagination } from "../pagination/Pagination"
import { SpineItemsManager } from "./SpineItemsManager"
import { createSpineLocator, SpineLocator } from "./locator/SpineLocator"
import { createSpineItemLocator as createSpineItemLocationResolver } from "../spineItem/locationResolver"
import { HTML_PREFIX } from "../constants"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { SpineItemsLoader } from "./loader/SpineItemsLoader"
import { observeResize } from "../utils/rxjs"
import { DestroyableClass } from "../utils/DestroyableClass"
import { noopElement } from "../utils/dom"
import { SpineItemsObserver } from "./SpineItemsObserver"
import { SpineLayout } from "./SpineLayout"
import { SpineItem } from "../spineItem/SpineItem"

export class Spine extends DestroyableClass {
  protected elementSubject = new BehaviorSubject<HTMLElement>(noopElement())
  public readonly spineItemsLoader: SpineItemsLoader

  public locator: SpineLocator

  public elementResize$ = this.elementSubject.pipe(
    switchMap((element) => observeResize(element)),
    share(),
  )

  public spineItemsObserver: SpineItemsObserver
  public spineLayout: SpineLayout

  public element$ = this.elementSubject.asObservable()

  constructor(
    protected parentElement$: Observable<HTMLElement>,
    protected context: Context,
    protected pagination: Pagination,
    public spineItemsManager: SpineItemsManager,
    public spineItemLocator: ReturnType<typeof createSpineItemLocationResolver>,
    protected settings: ReaderSettingsManager,
    protected hookManager: HookManager,
  ) {
    super()

    this.spineLayout = new SpineLayout(spineItemsManager, context, settings)

    this.locator = createSpineLocator({
      context,
      spineItemsManager,
      spineItemLocator,
      settings,
      spineLayout: this.spineLayout,
    })

    this.spineItemsLoader = new SpineItemsLoader(
      this.context,
      spineItemsManager,
      this.locator,
      settings,
      this.spineLayout,
    )

    this.spineItemsObserver = new SpineItemsObserver(
      spineItemsManager,
      this.locator,
    )

    const reloadOnManifestChange$ = context.manifest$.pipe(
      tap((manifest) => {
        this.spineItemsManager.destroyItems()

        const spineItems = manifest.spineItems.map(
          (resource, index) =>
            new SpineItem(
              resource,
              this.elementSubject.getValue(),
              this.context,
              this.settings,
              this.hookManager,
              index,
            ),
        )

        this.spineItemsManager.addMany(spineItems)
      }),
    )

    const updateElement$ = parentElement$.pipe(
      tap((parentElement) => {
        const element: HTMLElement =
          parentElement.ownerDocument.createElement(`div`)
        element.style.cssText = `
          height: 100%;
          position: relative;
        `
        element.className = `${HTML_PREFIX}-spine`

        this.elementSubject.next(element)
      }),
    )

    merge(reloadOnManifestChange$, updateElement$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  public get element() {
    return this.elementSubject.getValue()
  }

  public layout() {
    this.spineLayout.layout()
  }

  public destroy() {
    super.destroy()

    this.spineItemsLoader.destroy()
    this.elementSubject.getValue().remove()
    this.elementSubject.complete()
  }
}
