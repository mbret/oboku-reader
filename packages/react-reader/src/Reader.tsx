import React, { ReactElement, useState } from "react"
import { Manifest } from "@prose-reader/core"
import { RootContainer } from "./RootContainer"
import { ContainerElement } from "./ContainerElement"
import { useObserve } from "reactjrx"
import { EMPTY } from "rxjs"
import { ReaderWithEnhancer } from "./types"
// import { BottomNavBar } from "./navbar/bottom/BottomNavBar"
// import { TopNavBar } from "./navbar/top/TopNavBar"
import { UserSettingsInput } from "./settings/userSettings"
import { UserSettingsProvider } from "./settings/UserSettingsProvider"
import { ReaderProvider } from "./ReaderProvider"
import { Effects } from "./Effects"
// import { SettingsDialog } from "./settings/SettingsDialog"

export const ProseReactReader = <Instance extends ReaderWithEnhancer>({
  manifest,
  loadOptions,
  reader,
  loadingElement,
  ...userSettings
}: {
  manifest?: Manifest
  loadOptions?: Omit<Parameters<Instance["load"]>[1], "containerElement">
  reader?: ReaderWithEnhancer
  loadingElement?: ReactElement
} & UserSettingsInput) => {
  const [containerElement, setContainerElement] = useState<HTMLDivElement>()
  const loadStatus = useObserve(() => (!reader ? EMPTY : reader?.$.loadStatus$), [reader])

  return (
    <UserSettingsProvider {...userSettings}>
      <ReaderProvider reader={reader}>
        <RootContainer>
          <ContainerElement onRef={setContainerElement} visible={loadStatus === "ready"} />
          {loadStatus !== "ready" && loadingElement}
        </RootContainer>
        {/* <TopNavBar reader={reader} /> */}
        {/* <BottomNavBar reader={reader} /> */}
        {/* <SettingsDialog /> */}
        <Effects manifest={manifest} containerElement={containerElement} loadOptions={loadOptions} />
      </ReaderProvider>
    </UserSettingsProvider>
  )
}
