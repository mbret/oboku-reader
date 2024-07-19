import { Observable, ObservedValueOf } from "rxjs"
import { PanRecognizer, Recognizable, SwipeRecognizer, TapRecognizer, type TapEvent } from "gesturx"
import { HookManager } from "../../core/dist/hooks/HookManager"

export type Hook = {
  name: "beforeTap"
  runFn: (params: { event: TapEvent }) => boolean
}

export type GestureRecognizable = Recognizable<(TapRecognizer | PanRecognizer | SwipeRecognizer)[]>

export type GestureEvent = ObservedValueOf<GestureRecognizable["events$"]>

export type InputSettings = {
  panNavigation: "pan" | "swipe"
}

export type OutputSettings = InputSettings

export type EnhancerAPI = {
  gestures: {
    updateSettings: (settings: Partial<InputSettings>) => void
    unhandledEvent$: Observable<GestureEvent>
    hookManager: HookManager<Hook>
  }
}
