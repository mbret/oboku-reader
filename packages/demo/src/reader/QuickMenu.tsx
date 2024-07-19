import React from "react"
import { useNavigate } from "react-router"
import { useSetRecoilState } from "recoil"
import { IconButton } from "@chakra-ui/react"
import { ArrowBackIcon, SettingsIcon, SearchIcon, HamburgerIcon, QuestionOutlineIcon } from "@chakra-ui/icons"
import { isHelpOpenState, isSearchOpenState, isTocOpenState } from "../state"
import { AppBar } from "../common/AppBar"
import { useReader } from "./useReader"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"
import { BottomMenu } from "./BottomMenu"

export const QuickMenu = ({
  open,
  isComics,
  onSettingsClick
}: {
  open: boolean
  isComics: boolean
  onSettingsClick?: () => void
}) => {
  const navigate = useNavigate()
  const { reader } = useReader()
  const { manifest } = useObserve(reader?.context.state$ ?? NEVER) || {}
  const { title: bookTitle } = manifest ?? {}
  const setIsSearchOpen = useSetRecoilState(isSearchOpenState)
  const setIsTocOpenState = useSetRecoilState(isTocOpenState)
  const setIsHelpOpenState = useSetRecoilState(isHelpOpenState)

  const onSearchClick = () => {
    setIsSearchOpen(true)
  }

  const onTocClick = () => {
    setIsTocOpenState(true)
  }

  const onHelpClick = () => {
    setIsHelpOpenState(true)
  }

  return (
    <>
      {open && (
        <AppBar
          position="absolute"
          left={0}
          top={0}
          leftElement={
            <IconButton
              icon={<ArrowBackIcon />}
              aria-label="back"
              onClick={() => {
                if (window.history.state === null && window.location.pathname !== `/`) {
                  navigate(`/`)
                } else {
                  navigate(-1)
                }
              }}
            />
          }
          rightElement={
            <div
              style={{
                display: "flex"
              }}
            >
              {!isComics && <IconButton icon={<QuestionOutlineIcon />} aria-label="help" onClick={onHelpClick} marginRight={1} />}
              <IconButton icon={<HamburgerIcon />} aria-label="toc" onClick={onTocClick} marginRight={1} />
              {!isComics && <IconButton icon={<SearchIcon />} aria-label="search" onClick={onSearchClick} marginRight={1} />}
              <IconButton icon={<SettingsIcon />} onClick={onSettingsClick} aria-label="settings" />
            </div>
          }
          middleElement={bookTitle}
        />
      )}
      <BottomMenu open={open} />
    </>
  )
}
