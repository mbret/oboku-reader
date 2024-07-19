/* eslint-disable @typescript-eslint/no-explicit-any */
import { BehaviorSubject, Subject } from "rxjs"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { Pagination } from "../../pagination/Pagination"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { createCfiLocator } from "../../spine/cfiLocator"
import { createSpineLocationResolver } from "../../spine/locationResolver"
import { createSpineItemLocator } from "../../spineItem/locationResolver"
import { InternalNavigator } from "../InternalNavigator"
import { createNavigationResolver } from "../resolvers/NavigationResolver"
import { UserNavigator } from "../UserNavigator"
import { ViewportNavigator } from "../ViewportNavigator"
import { Item, SpineItemManagerMock } from "./SpineItemManagerMock"

export const generateItems = (size: number, number: number) => {
  return Array.from(Array(number)).map(
    (_, index) =>
      ({
        left: index * size,
        top: 0,
        right: (index + 1) * size,
        bottom: size,
        width: size,
        height: size,
      }) as Item,
  )
}

export const createNavigator = () => {
  const context = new Context()
  const settings = new ReaderSettingsManager({}, context)
  const spineItemManagerMock = new SpineItemManagerMock()
  const pagination = new Pagination(context, spineItemManagerMock as any)
  const elementSubject = new BehaviorSubject<HTMLElement>(
    document.createElement(`div`),
  )
  const spineElementSubject = new BehaviorSubject<HTMLElement>(
    document.createElement(`div`),
  )
  const viewportState$ = new BehaviorSubject<"free" | "busy">("free")
  const hookManager = new HookManager()
  const spineItemLocator = createSpineItemLocator({ context, settings })
  const cfiLocator = createCfiLocator({
    spineItemManager: spineItemManagerMock as any,
    context,
    spineItemLocator,
  })
  const spineLocator = createSpineLocationResolver({
    context,
    settings,
    spineItemLocator,
    spineItemManager: spineItemManagerMock as any,
  })
  const navigationResolver = createNavigationResolver({
    context,
    cfiLocator,
    locator: spineLocator,
    settings,
    spineItemManager: spineItemManagerMock as any,
  })
  const viewportController = new ViewportNavigator(
    settings,
    elementSubject,
    hookManager,
    context,
    spineElementSubject,
  )

  const scrollHappeningFromBrowser$ = new Subject()

  const userNavigator = new UserNavigator(
    settings,
    elementSubject,
    context,
    scrollHappeningFromBrowser$,
  )

  const internalNavigator = new InternalNavigator(
    settings,
    context,
    userNavigator.navigation$,
    viewportController,
    pagination,
    navigationResolver,
    spineItemManagerMock as any,
    spineLocator,
    elementSubject,
    viewportState$,
  )

  return { internalNavigator, userNavigator, context, spineItemManagerMock }
}
