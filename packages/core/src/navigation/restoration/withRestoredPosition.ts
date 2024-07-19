import { map, Observable } from "rxjs"
import { InternalNavigationEntry } from "../InternalNavigator"
import { restorePosition } from "./restorePosition"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineLocationResolver } from "../../spine/resolvers/SpineLocationResolver"
import { SpineItemManager } from "../../spineItemManager"
import { NavigationResolver } from "../resolvers/NavigationResolver"
import { SpineItemLocator } from "../../spineItem/locationResolver"
import { Context } from "../../context/Context"

type Navigation = {
  navigation: InternalNavigationEntry
}

export const withRestoredPosition =
  ({
    spineItemManager,
    settings,
    spineLocator,
    navigationResolver,
    spineItemLocator,
    context,
  }: {
    spineLocator: SpineLocationResolver
    navigationResolver: NavigationResolver
    spineItemManager: SpineItemManager
    settings: ReaderSettingsManager
    spineItemLocator: SpineItemLocator
    context: Context
  }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> =>
    stream.pipe(
      map((params) => ({
        ...params,
        navigation: {
          ...params.navigation,
          position: restorePosition({
            spineLocator,
            navigation: params.navigation,
            navigationResolver,
            settings,
            spineItemManager,
            spineItemLocator,
            context,
          }),
        },
      })),
    )
