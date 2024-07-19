import React, { memo } from "react"
import { ReactNode } from "react"

export const RootContainer = memo(function RootContainer({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        backgroundColor: "white",
        color: "black",
        display: "flex",
      }}
    >
      {children}
    </div>
  )
})
