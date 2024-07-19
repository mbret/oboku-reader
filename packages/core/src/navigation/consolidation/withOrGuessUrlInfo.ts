import { map, Observable } from "rxjs"
import { InternalNavigationInput } from "../InternalNavigator"
import { Context } from "../../context/Context"
import { getNavigationForUrl } from "../resolvers/getNavigationForUrl"
import { SpineLocator } from "../../spine/locationResolver"
import { SpineItemManager } from "../../spineItemManager"
import { NavigationResolver } from "../resolvers/NavigationResolver"

type Navigation = {
  navigation: InternalNavigationInput
}

export const withOrGuessUrlInfo =
  ({
    context,
    navigationResolver,
    spineItemManager,
    spineLocator,
  }: {
    context: Context
    spineItemManager: SpineItemManager
    navigationResolver: NavigationResolver
    spineLocator: SpineLocator
  }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    return stream.pipe(
      map((params) => {
        if (params.navigation.url) {
          const result = getNavigationForUrl({
            context,
            navigationResolver,
            spineItemManager,
            spineLocator,
            url: params.navigation.url,
          })

          console.log({ result })

          if (result) {
            return {
              ...params,
              navigation: {
                ...params.navigation,
                position: result.position,
                spineItem: result.spineItemId,
              },
            } as N
          }
        }

        return params
      }),
    )
  }
