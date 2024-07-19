import { map, Observable } from "rxjs"
import {
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../InternalNavigator"
import { SpineItemManager } from "../../spineItemManager"

type Navigation = {
  navigation: InternalNavigationInput | InternalNavigationEntry
}

export const withSpineItemDimensions =
  ({ spineItemManager }: { spineItemManager: SpineItemManager }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    return stream.pipe(
      map(({ navigation, ...rest }) => {
        const spineItemDimensions = spineItemManager.getAbsolutePositionOf(
          navigation.spineItem,
        )

        return {
          navigation: {
            ...navigation,
            spineItemHeight: spineItemDimensions?.height,
            spineItemWidth: spineItemDimensions?.width,
            spineItemLeft: spineItemDimensions.left,
            spineItemTop: spineItemDimensions.top,
          },
          ...rest,
        } as N
      }),
    )
  }
