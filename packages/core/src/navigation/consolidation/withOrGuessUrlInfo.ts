import { map, Observable } from "rxjs"
import { InternalNavigationInput } from "../InternalNavigator"
import { NavigationResolver } from "../resolvers/NavigationResolver"

type Navigation = {
  navigation: InternalNavigationInput
}

export const withOrGuessUrlInfo =
  ({
    navigationResolver,
  }: {
    navigationResolver: NavigationResolver
  }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    return stream.pipe(
      map((params) => {
        if (params.navigation.url) {
          const result = navigationResolver.getNavigationForUrl(
            params.navigation.url,
          )

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
