import { ArrowBackIcon } from "@chakra-ui/icons"
import { IconButton, Box, Modal, ModalContent, ModalOverlay } from "@chakra-ui/react"
import React, { FC, ReactNode } from "react"
import { AppBar } from "../navigation/AppBar"

export const FullScreenModal: FC<{ onClose: () => void; isOpen: boolean; title: string; children: ReactNode }> = ({
  onClose,
  isOpen,
  children,
  title
}) => {
  return (
    <Modal isOpen={isOpen} size="full" autoFocus={false} onClose={onClose}>
      <ModalOverlay />
      <ModalContent height="100%">
        <Box
          style={{
            height: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <AppBar
            leftElement={<IconButton icon={<ArrowBackIcon />} aria-label="back" onClick={onClose} />}
            middleElement={title}
          />
          {children}
        </Box>
      </ModalContent>
    </Modal>
  )
}
