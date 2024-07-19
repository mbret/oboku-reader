import { map, Observable } from "rxjs"
import {
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../InternalNavigator"
import { SpineItemManager } from "../../spineItemManager"
import { NavigationResolver } from "../resolvers/NavigationResolver"
import { getOrGuessPosition } from "./getOrGuessPosition"

export const withOrGuessPosition =
  ({
    spineItemManager,
    navigationResolver,
  }: {
    spineItemManager: SpineItemManager
    navigationResolver: NavigationResolver
  }) =>
  <Navigation extends { navigation: InternalNavigationInput }>(
    stream: Observable<Navigation>,
  ): Observable<
    Omit<Navigation, "navigation"> & {
      navigation: InternalNavigationEntry
    }
  > => {
    return stream.pipe(
      map(({ navigation, ...rest }) => {
        const position = getOrGuessPosition({
          navigation,
          navigationResolver,
          spineItemManager,
        })

        return {
          navigation: {
            ...navigation,
            position,
          },
          ...rest,
        }
      }),
    )
  }
