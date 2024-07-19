import { map, Observable } from "rxjs"
import {
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../InternalNavigator"
import { getOrGuessDirection } from "./getOrGuessDirection"
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"

type Navigation = {
  navigation: InternalNavigationInput
  previousNavigation: InternalNavigationEntry
  trackDirection: boolean
}

export const withOrGuessDirection =
  ({
    context,
    settings,
  }: {
    context: Context
    settings: ReaderSettingsManager
  }) =>
  (
    stream: Observable<Navigation>,
  ): Observable<
    Navigation & {
      direction: InternalNavigationEntry["directionFromLastNavigation"]
    }
  > => {
    return stream.pipe(
      map(({ navigation, previousNavigation, trackDirection }) => {
        const direction = getOrGuessDirection({
          context,
          navigation,
          previousNavigation,
          settings,
        })

        const conslidatedNavigation: InternalNavigationInput = {
          ...navigation,
          directionFromLastNavigation: trackDirection
            ? direction
            : navigation.directionFromLastNavigation,
        }

        return {
          previousNavigation,
          trackDirection,
          navigation: conslidatedNavigation,
          direction,
        }
      }),
    )
  }
