import { Box, BoxProps, Text } from "@chakra-ui/react"
import React, { FC } from "react"

export const OrDivider: FC<{ title?: string; style?: React.CSSProperties } & BoxProps> = ({ title = "or", ...rest }) => {
  return (
    <Box display="flex" alignItems="center" marginTop={2} marginBottom={2} width="100%" opacity={0.5} {...rest}>
      <Box
        width="100%"
        height="1px"
        style={{
          borderBottom: "1px solid white",
          opacity: "30%"
        }}
      ></Box>
      <Box marginX={2}>
        <Text sx={{ textTransform: "uppercase" }}>{title}</Text>
      </Box>
      <Box
        width="100%"
        style={{
          borderBottom: "1px solid white",
          opacity: "30%"
        }}
      ></Box>
    </Box>
  )
}
