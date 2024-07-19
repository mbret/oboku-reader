/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest"
import { restoreNavigationForControlledPageTurnMode } from "./restoreNavigationForControlledPageTurnMode"
import { createNavigationResolver } from "../resolvers/NavigationResolver"
import { SpineItemManagerMock } from "../tests/SpineItemManagerMock"
import { createSpineItemLocator } from "../../spineItem/locationResolver"
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { createCfiResolver } from "../../cfi/cfiResolver"
import { createSpineLocationResolver } from "../../spine/resolvers/SpineLocationResolver"
import { generateItems } from "../tests/utils"

describe(`Given a backward navigation to a new item`, () => {
  describe(`when item was unloaded`, () => {
    describe(`and item is bigger once loaded`, () => {
      it(`should restore position at the last page`, () => {
        const context = new Context()
        const settings = new ReaderSettingsManager({}, context)
        const spineItemManager = new SpineItemManagerMock()
        const spineItemLocator = createSpineItemLocator({
          context,
          settings,
        })
        const spineLocator = createSpineLocationResolver({
          context,
          settings,
          spineItemLocator,
          spineItemManager: spineItemManager as any,
        })
        const cfiLocator = createCfiResolver({
          spineItemLocator: spineItemLocator,
          context,
          spineItemManager: spineItemManager as any,
        })
        const navigationResolver = createNavigationResolver({
          cfiLocator,
          context,
          locator: spineLocator,
          settings,
          spineItemManager: spineItemManager as any,
        })

        // page of 50w
        context.update({
          visibleAreaRect: {
            height: 100,
            width: 50,
            x: 0,
            y: 0,
          },
        })

        // items of 2 pages
        spineItemManager.load(generateItems(100, 2))

        const position = restoreNavigationForControlledPageTurnMode({
          navigation: {
            position: {
              x: 0,
              y: 0,
            },
            spineItem: 0,
            spineItemWidth: 50,
            directionFromLastNavigation: "backward",
            spineItemHeight: 100,
            spineItemLeft: 0,
            spineItemTop: 0,
            triggeredBy: `user`,
            type: `api`,
          },
          navigationResolver,
          spineItemManager: spineItemManager as any,
          spineLocator,
        })

        expect(position).toEqual({ x: 50, y: 0 })
      })
    })
  })
})
