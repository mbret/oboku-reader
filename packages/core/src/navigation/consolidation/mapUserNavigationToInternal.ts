import { map, Observable } from "rxjs"
import { UserNavigationEntry } from "../UserNavigator"
import {
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../InternalNavigator"

export const mapUserNavigationToInternal = (
  stream: Observable<[UserNavigationEntry, InternalNavigationEntry]>,
): Observable<{
  navigation: InternalNavigationInput
  previousNavigation: InternalNavigationEntry
  trackDirection: boolean
}> => {
  return stream.pipe(
    map(([userNavigation, previousNavigation]) => {
      const navigation: InternalNavigationInput = {
        ...userNavigation,
        triggeredBy: "user",
        type: userNavigation.triggeredBy ?? `api`,
      }

      return {
        previousNavigation,
        navigation,
        trackDirection: true,
      }
    }),
  )
}
