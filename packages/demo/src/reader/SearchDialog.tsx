import { Heading, Input, Text, Box } from "@chakra-ui/react"
import React, { useCallback, useEffect, useState } from "react"
import { tap } from "rxjs/operators"
import { SearchResult } from "@prose-reader/enhancer-search"
import { groupBy } from "@prose-reader/core"
import { FullScreenModal } from "../common/FullScreenModal"
import { useReader } from "./useReader"

export const SearchDialog = ({ onExit, isOpen }: { onExit: () => void; isOpen: boolean }) => {
  const [text, setText] = useState("")
  const [results, setResults] = useState<SearchResult>([])
  const [searching, setSearching] = useState(false)
  const { reader } = useReader()

  const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    reader?.search.search(e.target.value)
  }

  const onClick = useCallback(
    (cfi: string) => {
      onExit()
      reader?.navigation.goToCfi(cfi)
    },
    [reader]
  )

  useEffect(() => {
    if (!isOpen) {
      setResults([])
      setText(``)
    }
  }, [isOpen])

  useEffect(() => {
    const $ = reader?.search.$.search$
      .pipe(
        tap((event) => {
          if (event.type === "start") {
            setResults([])
            setSearching(true)
          }
          if (event.type === "end") {
            setResults(event.data)
            setSearching(false)
          }
        })
      )
      .subscribe()

    return () => {
      $?.unsubscribe()
    }
  }, [reader])

  const groupedResults = groupBy(results, (item) => item.spineItemIndex)

  // console.log(results)

  return (
    <FullScreenModal isOpen={isOpen} onClose={onExit} title="Search">
      <Input placeholder="Type something..." value={text} onChange={onValueChange} borderRadius={0} size="lg" />
      <Box padding={2} pt={2} flex={1} style={{ overflow: "hidden", overflowY: "scroll" }}>
        {searching && <Text>Searching ...</Text>}
        {!searching && results.length === 0 && <p>There are no results</p>}
        {!searching && results.length >= 0 && (
          <>
            {Object.values(groupedResults).map((itemResults, i) => (
              <Box key={i} pt={2}>
                <Heading as="h2" size="sm">
                  Chapter {(itemResults[0]?.spineItemIndex || 0) + 1}
                </Heading>
                <Text fontSize="md" color="gray.500">
                  {itemResults.length} result(s)
                </Text>
                {itemResults.map((result, j) => (
                  <Item
                    key={j}
                    contextText={result.contextText}
                    pageIndex={result.pageIndex}
                    startOffset={result.startOffset}
                    text={text}
                    cfi={result.startCfi}
                    onClick={onClick}
                  />
                ))}
              </Box>
            ))}
          </>
        )}
      </Box>
    </FullScreenModal>
  )
}

const Item = ({
  pageIndex,
  contextText,
  startOffset,
  text,
  cfi,
  onClick
}: {
  pageIndex: number | undefined
  contextText: string
  startOffset: number
  text: string
  cfi: string
  onClick: (cfi: string) => void
}) => {
  const charsAroundText = 15
  const before = contextText.substring(Math.max(startOffset - charsAroundText, 0), Math.max(startOffset, 0))
  const after = contextText.substring(
    Math.min(startOffset + text.length, contextText.length - 1),
    Math.min(startOffset + text.length + charsAroundText, contextText.length - 1)
  )

  return (
    <div style={{ margin: 5, overflow: "hidden" }} onClick={() => onClick(cfi)}>
      <Text noOfLines={1} as="cite" style={{ display: "block" }}>
        "{before}
        <b>{text}</b>
        {after}"
      </Text>
      {pageIndex !== undefined && <Text color="gray.500">Page: {(pageIndex || 0) + 1}</Text>}
      {pageIndex === undefined && (
        <Text size="xs" color="gray.500">
          Chapter not loaded, click to navigate
        </Text>
      )}
    </div>
  )
}
