import { useEffect } from "react"
import { useSetRecoilState } from "recoil"
import { isMenuOpenState } from "../state"
import { useReader } from "../reader/useReader"
import { useSubscribe } from "reactjrx"
import { NEVER, tap } from "rxjs"

export const useGestureHandler = () => {
  const { reader } = useReader()
  const setMenuOpenState = useSetRecoilState(isMenuOpenState)

  useEffect(() => {
    const deregiter = reader?.gestures.hookManager.register("beforeTap", ({ event }) => {
      /**
       * Prevent click on bookmark area
       */
      if (reader.bookmarks.isClickEventInsideBookmarkArea(event.event)) {
        return false
      }

      return true
    })

    return () => {
      deregiter?.()
    }
  }, [reader])

  useSubscribe(
    () =>
      reader?.gestures.unhandledEvent$.pipe(
        tap((event) => {
          /**
           * Toggle menu when tap is not navigating
           */
          if (event.type === "tap") {
            setMenuOpenState((val) => !val)
          }
        })
      ) ?? NEVER,
    [reader]
  )
}
