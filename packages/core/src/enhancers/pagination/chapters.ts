import { Reader } from "../../reader"
import { Manifest } from "@prose-reader/shared"

/**
 * @todo
 * Using recursive here provoke this error
 * https://www.google.com/search?q=recursive+Exported+variable+has+or+is+using+namefrom+external+module+but+cannot+be+named.&rlz=1C5CHFA_en&sxsrf=AOaemvK4craypli45-fXfFRdfO82ibGRog%3A1631106978791&ei=orc4YZPUL-6tmAWJgKT4Dw&oq=recursive+Exported+variable+has+or+is+using+namefrom+external+module+but+cannot+be+named.&gs_lcp=Cgdnd3Mtd2l6EAM6BwgAEEcQsANKBAhBGABQjgdYjgdgtQtoAnACeACAAWGIAWGSAQExmAEAoAEByAEIwAEB&sclient=gws-wiz&ved=0ahUKEwiTrb6Au-_yAhXuFqYKHQkACf8Q4dUDCA4&uact=5
 * My guess is that something is wrong and I have too many recursive / inferred types everywhere and especially on the enhancer thingy.
 */
export type ChapterInfo = {
  title: string
  subChapter?: {
    title: string
    subChapter?: {
      title: string
      subChapter?: {
        title: string
        path: string
      }
      path: string
    }
    path: string
  }
  path: string
}

/**
 * @important it's important to compare only path vs path and or href vs href since
 * they have not comparable due to possible encoded values
 */
const buildChaptersInfo = (
  item: Manifest['items'][number],
  tocItem: NonNullable<Manifest["nav"]>["toc"],
  manifest: Manifest,
  spineItemIndex: number,
): ChapterInfo | undefined => {
  const {href} = item

  return tocItem.reduce((acc: ChapterInfo | undefined, tocItem) => {
    const indexOfHash = tocItem.href.indexOf(`#`)
    const tocItemPathWithoutAnchor =
      indexOfHash > 0 ? tocItem.href.substr(0, indexOfHash) : tocItem.href
    const tocItemHrefWithoutFilename = tocItemPathWithoutAnchor.substring(
      0,
      tocItemPathWithoutAnchor.lastIndexOf("/"),
    )
    const hrefWithoutFilename = href.substring(0, href.lastIndexOf("/"))
    const hrefIsChapterHref = href.endsWith(tocItemPathWithoutAnchor)
    const hrefIsWithinChapter =
      hrefWithoutFilename !== "" &&
      hrefWithoutFilename.endsWith(tocItemHrefWithoutFilename)

    /**
     * @important
     * A possible toc item candidate means that the chapter is at least not after the item.
     * It does not mean it's the correct chapter. The algorithm proceed by reducing every item
     * until we find the one that is not. We then return the last found one.
     *
     * This is the most important piece as it's the reason why we can detect all the pages
     * within a chapter.
     *
     * We rely on the order of items to be true. See https://www.w3.org/publishing/epub3/epub-packages.html#sec-nav-toc
     */
    const isPossibleTocItemCandidate = hrefIsChapterHref || hrefIsWithinChapter

    console.log({
      tocItem,
      hrefIsChapterHref,
      hrefWithoutFilename,
      hrefIsWithinChapter,
      item
    })

    if (isPossibleTocItemCandidate) {
      const spineItemIndexOfPossibleCandidate = manifest.spineItems.findIndex(
        (item) => item.href === tocItem.href,
      )
      const spineItemIsBeforeThisTocItem =
        spineItemIndex < spineItemIndexOfPossibleCandidate

      if (spineItemIsBeforeThisTocItem) return acc

      const info = {
        title: tocItem.title,
        path: tocItem.path,
      }

      const subInfo = buildChaptersInfo(href, tocItem.contents, manifest, spineItemIndex)

      if (subInfo) {
        return {
          ...info,
          subChapter: subInfo,
        }
      }

      return info
    }

    return acc
  }, undefined)
}

export const getTocItemForItem = (
  reader: Reader,
  spineItemIndex: number | undefined,
) => {
  const item = reader.spineItemsManager.get(spineItemIndex)?.item

  if (spineItemIndex === undefined || !item || !reader.context.manifest)
    return undefined

  return buildChaptersInfo(
    item,
    reader.context.manifest.nav?.toc ?? [],
    reader.context.manifest,
    spineItemIndex,
  )
}
