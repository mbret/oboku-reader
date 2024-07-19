import { atom, useRecoilCallback } from "recoil"
import { useEffect } from "react"
import { SIGNAL_RESET } from "reactjrx"
import { currentHighlight } from "./reader/highlights/states"

export const isMenuOpenState = atom({
  key: `isMenuOpenState`,
  default: false
})

const statesToReset = [isMenuOpenState]

export const useResetStateOnUnMount = () => {
  const resetStates = useRecoilCallback(
    ({ reset }) =>
      () => {
        statesToReset.forEach((state) => reset(state))
      },
    []
  )

  useEffect(() => {
    return () => {
      currentHighlight.setValue(SIGNAL_RESET)
      resetStates()
    }
  }, [resetStates])
}
