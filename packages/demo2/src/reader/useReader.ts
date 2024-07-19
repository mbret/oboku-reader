import { filter } from "rxjs"
import { ReaderInstance } from "../types"
import { isDefined, signal, useSignalValue } from "reactjrx"

export const readerSignal = signal<ReaderInstance | undefined>({
  default: undefined
})

export const reader$ = readerSignal.subject.pipe(filter(isDefined))

export const useReader = () => {
  const reader = useSignalValue(readerSignal)

  return { reader }
}
