import React from "react"
import { IconButton, Box } from "@chakra-ui/react"
import { ArrowBackIcon, ArrowDownIcon, ArrowForwardIcon, ArrowUpIcon } from "@chakra-ui/icons"
import { Scrubber } from "./Scrubber"
import { AppBar } from "../common/AppBar"
import { useReader } from "./useReader"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"
import { PaginationInfoSection } from "./navigation/PaginationInfoSection"

export const BottomMenu = ({ open }: { open: boolean }) => {
  const { reader } = useReader()
  const navigation = useObserve(reader?.navigation.state$ ?? NEVER)
  const settings = useObserve(reader?.settings.settings$ ?? NEVER)
  const isVerticalDirection = settings?.computedPageTurnDirection === "vertical"

  return (
    <>
      {open && (
        <AppBar
          position="absolute"
          left={0}
          bottom={0}
          height="auto"
          minHeight={140}
          leftElement={
            <IconButton
              icon={isVerticalDirection ? <ArrowUpIcon /> : <ArrowBackIcon />}
              aria-label="back"
              onClick={() =>
                isVerticalDirection ? reader?.navigation.goToTopSpineItem() : reader?.navigation.goToLeftSpineItem()
              }
              isDisabled={!navigation?.canGoLeftSpineItem && !navigation?.canGoTopSpineItem}
            />
          }
          rightElement={
            <IconButton
              icon={isVerticalDirection ? <ArrowDownIcon /> : <ArrowForwardIcon />}
              aria-label="forward"
              isDisabled={!navigation?.canGoRightSpineItem && !navigation?.canGoBottomSpineItem}
              onClick={() => {
                isVerticalDirection ? reader?.navigation.goToBottomSpineItem() : reader?.navigation.goToRightSpineItem()
              }}
            />
          }
          middleElement={
            <div
              style={{
                width: `100%`,
                paddingLeft: 20,
                paddingRight: 20,
                overflow: "hidden",
                textAlign: `center`
              }}
            >
              <PaginationInfoSection />
              <Box mt={2}>
                <Scrubber />
              </Box>
            </div>
          }
        />
      )}
    </>
  )
}
