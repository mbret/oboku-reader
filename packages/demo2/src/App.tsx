import React, { memo } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { RecoilRoot } from "recoil"
import { HomePage } from "./home/HomePage"
import { ChakraProvider, ColorModeProvider } from "@chakra-ui/react"
import { theme } from "./theme/theme"
import { BooksSelectionPage } from "./books/BooksSelectionPage"
import { Reader } from "./reader/Reader"
import { QueryClient, QueryClientProvider } from "reactjrx"

import "@fontsource/dancing-script/400.css"
import "@prose-reader/react-reader/dist/index.css"

const queryClient = new QueryClient()

export const App = memo(() => {
  return (
    <RecoilRoot>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <ColorModeProvider value="dark" options={{ initialColorMode: `dark`, useSystemColorMode: false }}>
            <Router>
              <Routes>
                <Route path="/reader/:url" element={<Reader />} />
                <Route path="/books" element={<BooksSelectionPage />} />
                <Route path="/" element={<HomePage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Router>
          </ColorModeProvider>
        </ChakraProvider>
      </QueryClientProvider>
    </RecoilRoot>
  )
})
