/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest"
import { restoreNavigationForControlledPageTurnMode } from "./restoreNavigationForControlledPageTurnMode"
import { createNavigationResolver } from "../resolvers/NavigationResolver"
import { SpineItemsManagerMock } from "../tests/SpineItemsManagerMock"
import { createSpineItemLocator } from "../../spineItem/locationResolver"
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { generateItems } from "../tests/utils"
import { Spine } from "../../spine/Spine"
import { noopElement } from "../../utils/dom"
import { Pagination } from "../../pagination/Pagination"
import { HookManager } from "../../hooks/HookManager"
import { of } from "rxjs"

describe(`Given a backward navigation to a new item`, () => {
  describe(`when item was unloaded`, () => {
    describe(`and item is bigger once loaded`, () => {
      it(`should restore position at the last page`, () => {
        const context = new Context()
        const settings = new ReaderSettingsManager({}, context)
        const spineItemsManager = new SpineItemsManagerMock()
        const pagination = new Pagination(context, spineItemsManager as any)
        const hooksManager = new HookManager()
        const spineItemLocator = createSpineItemLocator({ context, settings })
        const spine = new Spine(
          of(noopElement()),
          context,
          pagination,
          spineItemsManager as any,
          spineItemLocator,
          settings,
          hooksManager,
        )
        const navigationResolver = createNavigationResolver({
          context,
          locator: spine.locator,
          settings,
          spineItemsManager: spineItemsManager as any,
          spineLayout: spine.spineLayout,
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
        spineItemsManager.load(generateItems(100, 2))

        spine.layout()

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
            meta: {
              triggeredBy: `user`,
            },
            type: `api`,
            id: Symbol(),
          },
          navigationResolver,
          spineItemsManager: spineItemsManager as any,
          spineLocator: spine.locator,
          spineLayout: spine.spineLayout,
        })

        expect(position).toEqual({ x: 50, y: 0 })
      })
    })
  })
})
