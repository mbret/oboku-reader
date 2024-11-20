import React, { memo, useEffect, useState } from "react"
import { useReader } from "../useReader"
import { SIGNAL_RESET, useSignalValue } from "reactjrx"
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Stack,
  Text,
  Textarea
} from "@chakra-ui/react"
import { truncateText } from "../../common/utils"
import { selectedHighlightSignal } from "./states"

const HIGHLIGHT_COLORS = [
  "rgba(216, 191, 216, 1)", // Light purple
  "rgba(255, 225, 125, 1)", // Soft yellow
  "rgba(144, 238, 144, 1)", // Light green
  "rgba(173, 216, 230, 1)", // Light blue
  "rgba(255, 182, 193, 1)" // Light pink
] as const

export const HighlightMenu = memo(() => {
  const { reader } = useReader()
  const { highlight, selection } = useSignalValue(selectedHighlightSignal)
  const [selectedColor, setSelectedColor] = useState<string>(HIGHLIGHT_COLORS[0])
  const [contents, setContents] = useState<string>("")
  const isOpen = !!(selection ?? highlight)

  const onClose = () => {
    selectedHighlightSignal.setValue(SIGNAL_RESET)
  }

  const highlightColor = highlight?.color
  const highlightContent = (highlight?.contents ?? [])[0]

  useEffect(() => {
    setContents("")
  }, [isOpen])

  useEffect(() => {
    setContents(highlightContent ?? "")
  }, [highlightContent])

  useEffect(() => {
    if (highlightColor) {
      setSelectedColor(highlightColor)
    }
  }, [highlightColor])

  useEffect(() => {
    if (reader && highlight) {
      reader.annotations.select(highlight.id)

      return () => {
        reader.annotations.select(undefined)
      }
    }
  }, [reader, highlight])

  return (
    <Drawer placement="bottom" onClose={onClose} isOpen={isOpen}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerHeader borderBottomWidth="1px">
          {highlight ? "Highlight" : `Selection: "${truncateText(selection?.selection?.toString() ?? "", 10)}"`}
        </DrawerHeader>
        <DrawerBody gap={4} display="flex" flexDirection="column" pb={4}>
          <Stack>
            <Stack gap={2} flexDirection="row">
              {HIGHLIGHT_COLORS.map((color) => (
                <Box
                  bgColor={color}
                  height={10}
                  width={10}
                  key={color}
                  borderRadius="50%"
                  cursor="pointer"
                  {...(selectedColor === color && {
                    border: "4px solid white"
                  })}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </Stack>
            <Text>Annotation:</Text>
            <Textarea value={contents} onChange={(event) => setContents(event.target.value)} />
          </Stack>
          {!!selection && (
            <Button
              onClick={() => {
                onClose()
                reader?.annotations.highlight({ ...selection, color: selectedColor, contents: [contents] })
              }}
            >
              Highlight
            </Button>
          )}
          {!!highlight && (
            <Stack direction="row">
              <Button
                flex={1}
                onClick={() => {
                  onClose()
                  reader?.annotations.update(highlight.id, { color: selectedColor, contents: [contents] })
                }}
              >
                Update
              </Button>
              <Button
                flex={1}
                colorScheme="red"
                onClick={() => {
                  onClose()
                  reader?.annotations.delete(highlight.id)
                }}
              >
                Remove
              </Button>
            </Stack>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
})
