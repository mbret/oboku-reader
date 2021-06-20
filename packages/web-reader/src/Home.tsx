import React from 'react'
import { Link } from 'react-router-dom'
import { Button as ChakraButton } from "@chakra-ui/react"
import { ExternalLinkIcon } from "@chakra-ui/icons"

export const Home = () => {
  return (
    <div style={{
      height: `100%`,
      width: `100%`,
      margin: `auto`,
      maxWidth: 320,
      display: `flex`,
      flexDirection: `column`,
      alignItems: `center`,
      justifyContent: 'center'
    }}>
      <Link to={`/classic`} style={{ marginBottom: 20 }}>
        <ChakraButton rightIcon={<ExternalLinkIcon />}>Visit the classic reader</ChakraButton>
      </Link>
      <Link to={`/comics`} >
        <ChakraButton rightIcon={<ExternalLinkIcon />}>Visit the comic (showcase) reader</ChakraButton>
      </Link>
    </div>
  )
}