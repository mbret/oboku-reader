import { Observable } from "rxjs"
import { Context } from "../../context/Context"
import { Manifest } from "../../types"
import { createCommonSpineItem } from "../commonSpineItem"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { HookManager } from "../../hooks/HookManager"
import {
  buildStyleForViewportFrame,
  buildStyleForReflowableImageOnly,
  buildStyleWithMultiColumn,
} from "./styles"

export const createReflowableSpineItem = ({
  item,
  context,
  containerElement,
  viewportState$,
  settings,
  hookManager,
}: {
  item: Manifest[`spineItems`][number]
  containerElement: HTMLElement
  context: Context
  viewportState$: Observable<`free` | `busy`>
  settings: ReaderSettingsManager
  hookManager: HookManager
}) => {
  const commonSpineItem = createCommonSpineItem({
    context,
    item,
    parentElement: containerElement,
    viewportState$,
    settings,
    hookManager,
  })
  const spineItemFrame = commonSpineItem.spineItemFrame
  /**
   * This value is being used to avoid item to shrink back to smaller size when getting a layout after
   * the content has been loaded.
   * This means when previous content get unload, the user does not end up farther than he should be due to previous content
   * shrinking.
   *
   * @important
   * For now it's only used for continuous-scroll as experimental test. This could potentially solve the sliding
   * issue with reflow content as wel.
   */
  let latestContentHeightWhenLoaded: number | undefined

  const layout = ({
    blankPagePosition,
    minimumWidth,
  }: {
    blankPagePosition: `before` | `after` | `none`
    minimumWidth: number
  }) => {
    const { width: pageWidth, height: pageSizeHeight } = context.getPageSize()

    const continuousScrollableReflowableItem =
      context.manifest?.renditionLayout === "reflowable" &&
      context.manifest?.renditionFlow === "scrolled-continuous" &&
      commonSpineItem.item.renditionLayout === "reflowable"

    /**
     * In case of reflowable with continous scrolling, we don't know if the content is
     * bigger or smaller than the page size, therefore we find a middle ground to have
     * a pre-load page that is not too big nor too small to prevent weird jumping
     * once the frame load.
     *
     * We also use a minimum height still becaues we don't want all of the items to
     * preload since they would be in the current viewport.
     *
     * @todo make it a setting
     */
    const pageHeight = continuousScrollableReflowableItem
      ? Math.min(400, pageSizeHeight)
      : pageSizeHeight

    // reset width of iframe to be able to retrieve real size later
    spineItemFrame
      .getManipulableFrame()
      ?.frame?.style.setProperty(`width`, `${pageWidth}px`)

    /**
     * In case of reflowable with continous scrolling, we let the frame takes whatever height
     * it needs since it could be less or more than page size and we want a continous reading
     */
    if (!continuousScrollableReflowableItem) {
      spineItemFrame
        .getManipulableFrame()
        ?.frame?.style.setProperty(`height`, `${pageHeight}px`)
    }

    const { viewportDimensions, computedScale = 1 } =
      commonSpineItem.getViewPortInformation() ?? {}
    const visibleArea = context.state.visibleAreaRect
    const frameElement = spineItemFrame.getManipulableFrame()?.frame
    const isGloballyPrePaginated =
      context.manifest?.renditionLayout === `pre-paginated`

    // @todo simplify ? should be from common spine item
    if (
      spineItemFrame?.getIsLoaded() &&
      frameElement?.contentDocument &&
      frameElement?.contentWindow
    ) {
      let contentWidth = pageWidth
      let contentHeight =
        visibleArea.height + context.state.calculatedInnerMargin

      frameElement?.style.setProperty(`visibility`, `visible`)
      frameElement?.style.setProperty(`opacity`, `1`)

      if (viewportDimensions) {
        commonSpineItem.injectStyle(buildStyleForViewportFrame())

        commonSpineItem.executeOnLayoutBeforeMeasurementHook({ minimumWidth })

        spineItemFrame.staticLayout({
          width: viewportDimensions.width,
          height: viewportDimensions.height,
        })
        frameElement?.style.setProperty(`position`, `absolute`)
        frameElement?.style.setProperty(`top`, `50%`)
        frameElement?.style.setProperty(
          `left`,
          blankPagePosition === `before`
            ? context.isRTL()
              ? `25%`
              : `75%`
            : blankPagePosition === `after`
              ? context.isRTL()
                ? `75%`
                : `25%`
              : `50%`,
        )

        frameElement?.style.setProperty(
          `transform`,
          `translate(-50%, -50%) scale(${computedScale})`,
        )
        frameElement?.style.setProperty(`transform-origin`, `center center`)
      } else {
        const frameStyle = commonSpineItem.isImageType()
          ? buildStyleForReflowableImageOnly({
              isScrollable:
                context.manifest?.renditionFlow === `scrolled-continuous`,
              enableTouch:
                settings.settings.computedPageTurnMode !== `scrollable`,
            })
          : buildStyleWithMultiColumn(
              commonSpineItem.getDimensionsForReflowableContent(
                spineItemFrame.isUsingVerticalWriting(),
                minimumWidth,
              ),
            )

        commonSpineItem.injectStyle(frameStyle)

        commonSpineItem.executeOnLayoutBeforeMeasurementHook({ minimumWidth })

        if (spineItemFrame.isUsingVerticalWriting()) {
          const pages = Math.ceil(
            frameElement.contentDocument.documentElement.scrollHeight /
              pageHeight,
          )
          contentHeight = pages * pageHeight

          spineItemFrame.staticLayout({
            width: minimumWidth,
            height: contentHeight,
          })
        } else if (context.manifest?.renditionFlow === `scrolled-continuous`) {
          /**
           * We take body content here because the frame body might be smaller after
           * layout due to possible image content and image ratio. We need to be able
           * to retrieve the actual real body height. The window height is probably the same
           * as the current frame set height which may be wrong after resize.
           */
          contentHeight =
            // frameElement.contentDocument.documentElement.scrollHeight
            frameElement.contentDocument.body.scrollHeight
          latestContentHeightWhenLoaded = contentHeight

          spineItemFrame.staticLayout({
            width: minimumWidth,
            height: contentHeight,
          })
        } else {
          const pages = Math.ceil(
            frameElement.contentDocument.documentElement.scrollWidth /
              pageWidth,
          )
          /**
           * It is possible that a pre-paginated epub has reflowable item inside it. This is weird because
           * the spec says that we should use pre-paginated for each spine item. Could be a publisher mistake, in
           * any case we follow the spec and enforce the iframe to be contained within page width.
           * If we don't respect the spec we end up with dynamic pagination for a fixed document, which can update
           * the correct number of pages when item is loaded/unload. Bringing weird user experience.
           * The publisher should use global reflowable with pre-paginated content instead.
           */
          if (isGloballyPrePaginated) {
            contentWidth = pageWidth
          } else {
            contentWidth = pages * pageWidth
          }

          spineItemFrame.staticLayout({
            width: contentWidth,
            height: contentHeight,
          })
        }
      }

      const isFillingAllScreen = contentWidth % minimumWidth === 0

      // when a reflow iframe does not fill the entire screen (when spread) we will
      // enlarge the container to make sure no other reflow item starts on the same screen
      if (!isFillingAllScreen) {
        contentWidth = contentWidth + pageWidth
        if (context.isRTL() && !commonSpineItem.isUsingVerticalWriting()) {
          frameElement?.style.setProperty(`margin-left`, `${pageWidth}px`)
        }
      } else {
        frameElement?.style.setProperty(`margin-left`, `0px`)
      }

      commonSpineItem.layout({
        width: contentWidth,
        height: contentHeight,
        blankPagePosition,
        minimumWidth,
      })

      return { width: contentWidth, height: contentHeight }
    } else {
      commonSpineItem.executeOnLayoutBeforeMeasurementHook({ minimumWidth })
    }

    // const height = latestContentHeightWhenLoaded || pageHeight
    const height = pageHeight

    commonSpineItem.layout({
      width: minimumWidth,
      height,
      blankPagePosition,
      minimumWidth,
    })

    return { width: minimumWidth, height }
  }

  return {
    ...commonSpineItem,
    layout,
  }
}
