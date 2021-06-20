import { Context } from "../context"
import { Manifest } from "../types"
import { createCommonReadingItem } from "./commonReadingItem"

export const createReflowableReadingItem = ({ item, context, containerElement, iframeEventBridgeElement }: {
  item: Manifest['readingOrder'][number],
  containerElement: HTMLElement,
  iframeEventBridgeElement: HTMLElement,
  context: Context,
}) => {
  const commonReadingItem = createCommonReadingItem({ context, item, containerElement, iframeEventBridgeElement })
  let readingItemFrame = commonReadingItem.readingItemFrame

  const getDimensions = (isUsingVerticalWriting: boolean, minimumWidth: number) => {
    const pageSize = context.getPageSize()
    const horizontalMargin = context.getHorizontalMargin()
    let columnWidth = pageSize.width - (horizontalMargin * 2)
    const columnHeight = pageSize.height - (horizontalMargin * 2)

    if (isUsingVerticalWriting) {
      columnWidth = minimumWidth - (horizontalMargin * 2)
    }

    return {
      columnHeight,
      columnWidth,
      horizontalMargin,
      // verticalMargin: context.getVerticalMargin()
    }
  }

  const applySize = ({ minimumWidth, blankPagePosition }: { blankPagePosition: `before` | `after` | `none`, minimumWidth: number }) => {
    const { width: pageWidth, height: pageHeight } = context.getPageSize()
    const viewportDimensions = readingItemFrame.getViewportDimensions()
    const visibleArea = context.getVisibleAreaRect()
    const frameElement = readingItemFrame.getManipulableFrame()?.frame

    if (readingItemFrame?.getIsLoaded() && frameElement?.contentDocument && frameElement?.contentWindow) {
      let contentWidth = pageWidth
      let contentHeight = visibleArea.height + context.getCalculatedInnerMargin()

      frameElement?.style.setProperty(`visibility`, `visible`)
      frameElement?.style.setProperty(`opacity`, `1`)

      if (viewportDimensions) {
        const computedScale = Math.min(pageWidth / viewportDimensions.width, pageHeight / viewportDimensions.height)
        commonReadingItem.injectStyle(readingItemFrame, buildStyleForFakePrePaginated())
        readingItemFrame.staticLayout({
          width: viewportDimensions.width,
          height: viewportDimensions.height,
        })
        frameElement?.style.setProperty('--scale', `${computedScale}`)
        frameElement?.style.setProperty('position', `absolute`)
        frameElement?.style.setProperty(`top`, `50%`)
        frameElement?.style.setProperty(`left`, `50%`)
        frameElement?.style.setProperty(`transform`, `translate(-50%, -50%) scale(${computedScale})`)
        frameElement?.style.setProperty(`transform-origin`, `center center`)
      } else {
        const frameStyle = buildStyleWithMultiColumn(getDimensions(readingItemFrame.isUsingVerticalWriting(), minimumWidth))
        commonReadingItem.injectStyle(readingItemFrame, frameStyle)

        if (readingItemFrame.isUsingVerticalWriting()) {
          const pages = Math.ceil(
            frameElement.contentDocument.documentElement.scrollHeight / pageHeight
          )
          contentHeight = pages * pageHeight

          readingItemFrame.staticLayout({
            width: minimumWidth,
            height: contentHeight,
          })
        } else {
          const pages = Math.ceil(
            frameElement.contentDocument.documentElement.scrollWidth / pageWidth
          )
          contentWidth = pages * pageWidth

          readingItemFrame.staticLayout({
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
        if (context.isRTL() && !commonReadingItem.isUsingVerticalWriting()) {
          frameElement?.style.setProperty(`margin-left`, `${pageWidth}px`)
        }
      } else {
        frameElement?.style.setProperty(`margin-left`, `0px`)
      }

      commonReadingItem.layout({ width: contentWidth, height: contentHeight, blankPagePosition, minimumWidth })

      return { width: contentWidth, height: contentHeight }
    } else {
      commonReadingItem.layout({ width: minimumWidth, height: pageHeight, blankPagePosition, minimumWidth })
    }

    return { width: minimumWidth, height: pageHeight }
  }

  const layout = (layoutInformation: { blankPagePosition: `before` | `after` | `none`, minimumWidth: number }) => {
    const { width: pageWidth, height: pageHeight } = context.getPageSize()
    // reset width of iframe to be able to retrieve real size later
    readingItemFrame.getManipulableFrame()?.frame?.style.setProperty(`width`, `${pageWidth}px`)
    readingItemFrame.getManipulableFrame()?.frame?.style.setProperty(`height`, `${pageHeight}px`)

    return applySize(layoutInformation)
  }

  const unloadContent = () => {
    commonReadingItem.unloadContent()
  }

  const destroy = () => {
    commonReadingItem.destroy()
  }

  return {
    ...commonReadingItem,
    isReflowable: true,
    unloadContent,
    layout,
    destroy,
  }
}

const buildStyleForFakePrePaginated = () => {
  return `
    html {
      width: 100%;
      height: 100%;
    }

    body {
      width: 100%;
      height: 100%;
      margin: 0;
    }
    ${/*
      needed for hammer to work with things like velocity
    */``}
    html, body {
      touch-action: pan-y;
    }
    img {
      display: flex;
      max-width: 100%;
      max-height: 100%;
      margin: 0 auto;
    }
  `
}

const buildStyleWithMultiColumn = ({ columnHeight, columnWidth, horizontalMargin }: {
  columnWidth: number,
  columnHeight: number,
  horizontalMargin: number
  // verticalMargin: number
}) => {
  return `
    parsererror {
      display: none !important;
    }
    ${/*
      might be html * but it does mess up things like figure if so.
      check accessible_epub_3
    */``}
    html, body {
      margin: 0;
      padding: 0 !important;
      -max-width: ${columnWidth}px !important;
    }
    ${/*
      body {
        height: ${columnHeight}px !important;
        width: ${columnWidth}px !important;
      }
    */``}
    body {
      padding: 0 !important;
      width: ${columnWidth}px !important;
      height: ${columnHeight}px !important;
      -margin-left: ${horizontalMargin}px !important;
      -margin-right: ${horizontalMargin}px !important;
      margin: ${horizontalMargin}px ${horizontalMargin}px !important;
      -padding-top: ${horizontalMargin}px !important;
      -padding-bottom: ${horizontalMargin}px !important;
      overflow-y: hidden;
      column-width: ${columnWidth}px !important;
      column-gap: ${horizontalMargin * 2}px !important;
      column-fill: auto !important;
      word-wrap: break-word;
      box-sizing: border-box;
    }
    body {
      margin: 0;
    }
    ${/*
      needed for hammer to work with things like velocity
    */``}
    html, body {
      touch-action: pan-y;
    }
    ${/*
      this messes up hard, be careful with this
    */``}
    * {
      -max-width: ${columnWidth}px !important;
    }
    ${/*
      this is necessary to have a proper calculation when determining size
      of iframe content. If an img is using something like width:100% it would expand to
      the size of the original image and potentially gives back a wrong size (much larger)
      @see https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Columns/Handling_Overflow_in_Multicol
    */``}
    img, video, audio, object, svg {
      max-width: 100%;
      max-width: ${columnWidth}px !important;
      max-height: ${columnHeight}px !important;
      -pointer-events: none;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    figure {
      d-max-width: ${columnWidth}px !important;
    }
    img {
      object-fit: contain;
      break-inside: avoid;
      box-sizing: border-box;
      d-max-width: ${columnWidth}px !important;
    }
    ${/*
      img, video, audio, object, svg {
        max-height: ${columnHeight}px !important;
        box-sizing: border-box;
        object-fit: contain;
        -webkit-column-break-inside: avoid;
        page-break-inside: avoid;
        break-inside: avoid;
      }
    */``}
    table {
      max-width: ${columnWidth}px !important;
      table-layout: fixed;
    }
    td {
      max-width: ${columnWidth}px;
    }
  `
}