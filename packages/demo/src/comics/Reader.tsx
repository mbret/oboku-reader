import React, { useCallback, useState } from "react"
import { useEffect } from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import { useComicsGestureHandler } from "./useComicsGestureHandler"
import { Reader as ReactReader } from "@prose-reader/react"
import { QuickMenu } from "../reader/QuickMenu"
import { bookReadyState, isMenuOpenState, useResetStateOnUnMount } from "../state"
import { ComicsSettings } from "./ComicsSettings"
import { Loading } from "../reader/Loading"
import { useBookmarks } from "../reader/useBookmarks"
import { useParams } from "react-router"
import { BookError } from "../reader/BookError"
import { getEpubUrlFromLocation } from "../serviceWorker/utils"
import { HighlightMenu } from "../reader/HighlightMenu"
import { ZoomingIndicator } from "../common/ZoomingIndicator"
import { Manifest } from "@prose-reader/core"
import { createAppReader, ReactReaderProps, ReaderInstance } from "../types"
import { useReader } from "../reader/useReader"
import { useReaderSettings } from "../common/useReaderSettings"

export const Reader = ({
  onReader,
  manifest,
  manifestError
}: {
  onReader: (instance: ReaderInstance | undefined) => void
  manifest?: Manifest | undefined
  manifestError?: unknown
}) => {
  const { url = `` } = useParams<`url`>()
  const query = new URLSearchParams(window.location.search)
  const { computedPageTurnMode } = useReaderSettings() ?? {}
  const isUsingFreeScroll = computedPageTurnMode === `scrollable`
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { reader } = useReader()
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined)
  const [bookReady, setBookReady] = useRecoilState(bookReadyState)
  const isMenuOpen = useRecoilValue(isMenuOpenState)
  const [readerOptions] = useState<ReactReaderProps["options"] | undefined>({
    pageTurnAnimation: `slide`,
    pageTurnDirection: query.has("vertical") ? `vertical` : `horizontal`,
    pageTurnMode: query.has("free") ? `scrollable` : `controlled`,
    layoutAutoResize: `container`,
    // cover portrait and spread mode without blank page
    numberOfAdjacentSpineItemToPreLoad: 0,
  })
  const [readerLoadOptions, setReaderLoadOptions] = useState<ReactReaderProps["loadOptions"]>(undefined)

  useBookmarks(reader, url)
  useComicsGestureHandler(container, isUsingFreeScroll)

  const onReady = useCallback(() => {
    setBookReady(true)
  }, [setBookReady])

  useEffect(() => {
    if (manifest) {
      setReaderLoadOptions({
        cfi: localStorage.getItem(`cfi`) || undefined
      })
    }
  }, [manifest, setReaderLoadOptions])

  useEffect(
    () => () => {
      onReader(undefined)
    },
    [onReader]
  )

  useResetStateOnUnMount()

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.reader = reader

  return (
    <>
      <div
        style={{
          height: `100%`,
          width: `100%`
        }}
        ref={(ref) => {
          if (ref) {
            setContainer(ref)
          }
        }}
      >
        {!!readerLoadOptions && (
          <ReactReader
            manifest={manifest}
            onReader={onReader}
            onReady={onReady}
            loadOptions={readerLoadOptions}
            options={readerOptions}
            createReader={createAppReader}
          />
        )}
        {!!manifestError && <BookError url={getEpubUrlFromLocation(url)} />}
        {!bookReady && !manifestError && <Loading />}
      </div>
      <HighlightMenu />
      <QuickMenu open={isMenuOpen} onSettingsClick={() => setIsSettingsOpen(true)} isComics />
      <ZoomingIndicator />
      {reader && <ComicsSettings reader={reader} open={isSettingsOpen} onExit={() => setIsSettingsOpen(false)} />}
    </>
  )
}
