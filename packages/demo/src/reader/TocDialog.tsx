import { CheckCircleIcon } from "@chakra-ui/icons"
import { List, ListIcon, ListItem, Text } from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { FullScreenModal } from "../common/FullScreenModal"
import { useReader } from "./useReader"
import { usePagination } from "./state"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"

export const TocDialog = ({ onExit, isOpen }: { onExit: () => void; isOpen: boolean }) => {
  const { reader$, reader } = useReader()
  const { manifest } = useObserve(reader?.context.state$ ?? NEVER) ?? {}
  const { nav, renditionLayout } = manifest ?? {}
  const pagination = usePagination(reader$)
  const toc = nav?.toc || []
  const { beginSpineItemIndex, beginPageIndexInSpineItem } = pagination ?? {}
  const currentPage = (renditionLayout === "reflowable" ? beginPageIndexInSpineItem : beginSpineItemIndex) || 0
  const [currentSubChapter, setCurrentSubChapter] = useState<NonNullable<typeof pagination>["beginChapterInfo"] | undefined>()

  const buildTocForItem = (tocItem: (typeof toc)[number], index: number, lvl: number) => (
    <React.Fragment key={index}>
      <ListItem
        style={{
          paddingLeft: 10 + lvl * 20,
          display: "flex",
          alignItems: "center"
        }}
        onClick={() => {
          onExit()
          reader?.navigation.goToUrl(tocItem.href)
        }}
      >
        {currentSubChapter?.path === tocItem.path && <ListIcon as={CheckCircleIcon} />}
        {currentSubChapter?.path !== tocItem.path && <ListIcon as={CheckCircleIcon} style={{ visibility: "hidden" }} />}
        <div>
          {tocItem.title || "unknown"}
          {currentSubChapter?.path === tocItem.path && (
            <>
              <br />{" "}
              <Text style={{ fontSize: `0.8rem`, color: `rgba(0, 0, 0, 0.54)` }}>{`Currently on page ${currentPage + 1}`}</Text>
            </>
          )}
        </div>
      </ListItem>
      {tocItem.contents.length > 0 && (
        <List as="div" spacing={2}>
          {tocItem.contents.map((tocItem, index) => buildTocForItem(tocItem, index, lvl + 1))}
        </List>
      )}
    </React.Fragment>
  )

  useEffect(() => {
    if (isOpen) {
      let currentSubChapter = pagination?.beginChapterInfo

      while (currentSubChapter?.subChapter) {
        currentSubChapter = currentSubChapter?.subChapter
      }

      setCurrentSubChapter(currentSubChapter)
    } else {
      setCurrentSubChapter(undefined)
    }
  }, [isOpen, pagination])

  return (
    <FullScreenModal isOpen={isOpen} onClose={onExit} title="Table Of Content">
      <List spacing={3} style={{ paddingTop: 10, paddingBottom: 10 }} overflowY="scroll" height="100%">
        {nav?.toc.map((tocItem, index) => buildTocForItem(tocItem, index, 0))}
      </List>
    </FullScreenModal>
  )
}
