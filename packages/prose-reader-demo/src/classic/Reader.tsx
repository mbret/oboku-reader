import React, { ComponentProps, useCallback, useState } from "react"
import { useEffect } from "react"
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil"
import { useGestureHandler } from "./useGestureHandler"
import { Reader as ReactReader } from "@prose-reader/react"
import { Manifest } from "@prose-reader/core"
import { QuickMenu } from "../QuickMenu"
import {
  bookReadyState,
  isHelpOpenState,
  isMenuOpenState,
  isSearchOpenState,
  manifestState,
  paginationState,
  useResetStateOnUnMount
} from "../state"
import { ClassicSettings } from "./ClassicSettings"
import { Loading } from "../Loading"
import { createAppReader, ReactReaderProps, ReaderInstance } from "../types"
import { useBookmarks } from "../useBookmarks"
import { useParams } from "react-router"
import { BookError } from "../BookError"
import { getEpubUrlFromLocation } from "../serviceWorker/utils"
import { HighlightMenu } from "../HighlightMenu"
import { SearchDialog } from "../SearchDialog"
import { HelpDialog } from "../HelpDialog"
import { useReader } from "../useReader"

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
  const [reader] = useReader()
  const setManifestState = useSetRecoilState(manifestState)
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined)
  const setPaginationState = useSetRecoilState(paginationState)
  const [bookReady, setBookReady] = useRecoilState(bookReadyState)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const isMenuOpen = useRecoilValue(isMenuOpenState)
  const [isSearchOpen, setIsSearchOpen] = useRecoilState(isSearchOpenState)
  const [isHelpOpen, setIsHelpOpen] = useRecoilState(isHelpOpenState)
  const [readerOptions] = useState<ReactReaderProps["options"]>({
    // fontScale: parseFloat(localStorage.getItem(`fontScale`) || `1`),
    // lineHeight: parseFloat(localStorage.getItem(`lineHeight`) || ``) || undefined,
    // theme: undefined,
    pageTurnAnimation: `fade`,
    layoutAutoResize: `container`,
    numberOfAdjacentSpineItemToPreLoad: 0
  })

  const [readerLoadOptions, setReaderLoadOptions] = useState<ReactReaderProps["loadOptions"]>(undefined)

  useGestureHandler(container)
  useBookmarks(reader, url)

  const onPaginationChange: ComponentProps<typeof ReactReader>["onPaginationChange"] = (info) => {
    localStorage.setItem(`cfi`, info?.beginCfi || ``)
    setPaginationState(info)
  }

  const onReady = useCallback(() => {
    setBookReady(true)
  }, [setBookReady])

  const onClassicSettingsExit = useCallback(() => setIsSettingsOpen(false), [])

  useEffect(() => {
    const linksSubscription = reader?.$.links$.subscribe((data) => {
      if (data.event === "linkClicked") {
        if (!data.data.href) return
        const url = new URL(data.data.href)
        if (window.location.host !== url.host) {
          const response = confirm(`You are going to be redirected to external link`)
          if (response) {
            window.open(data.data.href, "__blank")
          }
        }
      }
    })

    return () => {
      linksSubscription?.unsubscribe()
    }
  }, [reader])

  useEffect(() => {
    if (!reader || !manifest) return

    setManifestState(manifest)
  }, [setManifestState, reader, manifest])

  useEffect(() => {
    if (manifest) {
      setReaderLoadOptions({
        cfi: localStorage.getItem(`cfi`) || undefined
      })
    }
  }, [manifest, setReaderLoadOptions])

  useEffect(() => {
    if (!reader) return

    return () => {
      reader.destroy()

      onReader(undefined)
    }
  }, [reader, onReader])

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
        {readerLoadOptions && (
          <ReactReader
            manifest={manifest}
            onReader={onReader}
            onReady={onReady}
            loadOptions={readerLoadOptions}
            onPaginationChange={onPaginationChange}
            options={readerOptions}
            createReader={createAppReader}
          />
        )}
        {!!manifestError && <BookError url={getEpubUrlFromLocation(url)} />}
        {!bookReady && !manifestError && <Loading />}
      </div>
      <HighlightMenu />
      <QuickMenu open={isMenuOpen} isComics={false} onSettingsClick={() => setIsSettingsOpen(true)} />
      {reader && <ClassicSettings reader={reader} open={isSettingsOpen} onExit={onClassicSettingsExit} />}
      <SearchDialog isOpen={isSearchOpen} onExit={() => setIsSearchOpen(false)} />
      <HelpDialog isOpen={isHelpOpen} onExit={() => setIsHelpOpen(false)} />
    </>
  )
}
