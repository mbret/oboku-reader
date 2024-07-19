import { map, Observable } from "rxjs"
import {
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../InternalNavigator"
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineItemManager } from "../../spineItemManager"
import { getOrGuessSpineItem } from "./getOrGuessSpineItem"
import { NavigationResolver } from "../resolvers/NavigationResolver"
import { SpineLocator } from "../../spine/locationResolver"
import { SpineItem } from "../../spineItem/createSpineItem"

type Navigation = {
  navigation: InternalNavigationInput
  previousNavigation: InternalNavigationEntry
  trackDirection: boolean
  direction: InternalNavigationEntry["directionFromLastNavigation"]
}

export const withOrGuessSpineItem =
  ({
    context,
    settings,
    spineItemManager,
    navigationResolver,
    spineLocator,
  }: {
    context: Context
    settings: ReaderSettingsManager
    spineItemManager: SpineItemManager
    navigationResolver: NavigationResolver
    spineLocator: SpineLocator
  }) =>
  (
    stream: Observable<Navigation>,
  ): Observable<
    Navigation & {
      spineItem?: SpineItem
    }
  > => {
    return stream.pipe(
      map(({ navigation, direction, ...rest }) => {
        const spineItem = getOrGuessSpineItem({
          context,
          navigation,
          settings,
          direction,
          navigationResolver,
          spineItemManager,
          spineLocator,
        })

        const consolidatedNavigation: InternalNavigationInput = {
          ...navigation,
          spineItem: spineItemManager.getSpineItemIndex(spineItem),
        }

        return {
          navigation: consolidatedNavigation,
          spineItem,
          direction,
          ...rest,
        }
      }),
    )
  }
