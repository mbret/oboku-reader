import React from 'react'
import { useHistory } from 'react-router'
import { useRecoilValue } from 'recoil'
import { IconButton } from "@chakra-ui/react"
import { ArrowBackIcon, ArrowForwardIcon, SettingsIcon } from "@chakra-ui/icons"
import { useToggleFontsSettings } from './FontsSettings'
import { useReader } from './ReaderProvider'
import { Scrubber } from './Scrubber'
import { bookTitleState, isComicState, manifestState, paginationState } from './state'

export const QuickMenu = ({ open, onReadingItemChange }: {
  open: boolean,
  onReadingItemChange: (index: number) => void,
}) => {
  const history = useHistory()
  const reader = useReader()
  const bookTitle = useRecoilValue(bookTitleState)
  const manifest = useRecoilValue(manifestState)
  const numberOfSpineItems = manifest?.readingOrder.length ?? 0
  const pagination = useRecoilValue(paginationState)
  const [pageIndex, endPageIndex] = [(pagination?.begin.pageIndexInChapter || 0) + 1, (pagination?.end.pageIndexInChapter || 0) + 1].sort()
  const beginAndEndAreDifferent =
    (pagination?.begin.pageIndexInChapter !== pagination?.end.pageIndexInChapter)
    || (pagination?.begin.readingItemIndex !== pagination?.end.readingItemIndex)
  const isComic = useRecoilValue(isComicState)
  const currentReadingItemIndex = pagination?.begin.readingItemIndex || 0
  const [absoluteBeginPageIndex = 0, absoluteEndPageIndex = 0] = [pagination?.begin.absolutePageIndex, pagination?.end.absolutePageIndex].sort()
  const toggleFontsSettings = useToggleFontsSettings()

  const buildTitleChain = (chapterInfo: NonNullable<typeof pagination>['begin']['chapterInfo']): string => {
    if (chapterInfo?.subChapter) {
      return `${chapterInfo.title} / ${buildTitleChain(chapterInfo.subChapter)}`
    }
    return chapterInfo?.title || ''
  }

  return (
    <>
      {open && (
        <div style={{
          position: `absolute`,
          left: 0,
          top: 0,
          width: `100%`,
          height: 70,
          backgroundColor: 'chocolate',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 10,
          paddingRight: 10,
        }}>
          <div style={{}}>
            <IconButton icon={<ArrowBackIcon />} aria-label="back" onClick={() => {
              if (window.history.state === null && history.location.pathname !== `/`) {
                history.replace(`/`)
              } else {
                history.goBack()
              }
            }} />
          </div>
          <div style={{
            color: 'white',
            // flex: 1
          }}>
            {bookTitle}
          </div>
          <div style={{

          }}>
            <IconButton icon={<SettingsIcon />} onClick={toggleFontsSettings} aria-label="settings" />
          </div>
        </div>
      )}
      {open && (
        <div style={{
          position: `absolute`,
          left: 0,
          bottom: 0,
          width: `100%`,
          height: 100,
          backgroundColor: 'chocolate',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            paddingLeft: 10
          }}>
            {(
              (manifest?.readingDirection === 'ltr' && currentReadingItemIndex > 0)
              || (manifest?.readingDirection !== 'ltr' && (pagination?.begin.readingItemIndex || 0) < numberOfSpineItems - 1)
            ) ? (
              <IconButton icon={<ArrowBackIcon />} aria-label="back" onClick={_ => reader?.goToLeftSpineItem()} />
            )
              : (
                <IconButton icon={<ArrowBackIcon />} aria-label="back" disabled />
              )}
          </div>
          <div style={{
            width: `100%`,
            paddingLeft: 20,
            paddingRight: 20,
            overflow: 'hidden',
          }}>
            <div style={{
              color: 'white'
            }}>
              {`Progression: ${Math.round((pagination?.percentageEstimateOfBook || 0) * 100)}%`}
            </div>
            <div style={{
              color: 'white',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow:'hidden',
            }}>
              {`Chapter ${buildTitleChain(pagination?.begin.chapterInfo)}`}
            </div>
            {!isComic && (
              <div style={{
                color: 'white'
              }}>
                {beginAndEndAreDifferent && (
                  <>{`page ${pageIndex} - ${endPageIndex} of ${pagination?.begin.numberOfPagesInChapter}`}</>
                )}
                {!beginAndEndAreDifferent && (
                  <>{`page ${pageIndex} of ${pagination?.begin.numberOfPagesInChapter}`}</>
                )}
              </div>
            )}
            {isComic && (
              <div style={{
                color: 'white'
              }}>
                {beginAndEndAreDifferent && (
                  <>
                    {`page ${absoluteBeginPageIndex + 1} - ${absoluteEndPageIndex + 1} of ${pagination?.numberOfTotalPages}`}
                  </>
                )}
                {!beginAndEndAreDifferent && (
                  <>
                    {`page ${absoluteBeginPageIndex + 1} of ${pagination?.numberOfTotalPages}`}
                  </>
                )}
              </div>
            )}
            <Scrubber />
          </div>
          <div style={{
            paddingRight: 10
          }}>
            {(
              (manifest?.readingDirection === 'ltr' && (pagination?.begin.readingItemIndex || 0) < numberOfSpineItems - 1)
              || (manifest?.readingDirection !== 'ltr' && currentReadingItemIndex > 0)
            ) ? (
              <IconButton icon={<ArrowForwardIcon />} onClick={_ => reader?.goToRightSpineItem()} aria-label="forward" />
            ) : (
              <IconButton icon={<ArrowForwardIcon />} aria-label="forward" disabled />
            )}
          </div>
        </div>
      )}
    </>
  )
}