import { HookManager, Reader } from "@prose-reader/core"
import { ObservedValueOf, Subject, merge, takeUntil, tap } from "rxjs"
import { PanRecognizer, Recognizable, SwipeRecognizer, TapRecognizer } from "gesturx"
import { EnhancerAPI, InputSettings, Hook } from "./types"
import { registerTaps } from "./taps"
import { registerPan } from "./pan"
import { registerSwipe } from "./swipe"
import { GesturesSettingsManager } from "./SettingsManager"

export const gesturesEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions & {
      gestures?: InputSettings
    },
  ): InheritOutput & EnhancerAPI => {
    const { gestures = {}, ...rest } = options
    const reader = next(rest as InheritOptions)

    const settingsManager = new GesturesSettingsManager(gestures)

    const hookManager = new HookManager<Hook>()
    const panRecognizer = new PanRecognizer()
    const tapRecognizer = new TapRecognizer({
      failWith: [panRecognizer],
    })
    const swipeRecognizer = new SwipeRecognizer()
    const recognizable = new Recognizable({
      recognizers: [tapRecognizer, panRecognizer, swipeRecognizer],
    })
    const unhandledEvent$ = new Subject<ObservedValueOf<typeof recognizable.events$>>()

    const containerUpdate$ = reader.context.containerElement$.pipe(
      tap((container) => {
        recognizable.update({
          container,
        })
      }),
    )

    const tapGestures$ = registerTaps({
      hookManager,
      reader,
      recognizable,
      unhandledEvent$,
      settingsManager,
    })

    const panGestures$ = registerPan({
      hookManager,
      reader,
      recognizable,
      unhandledEvent$,
      settingsManager,
    })

    const swipeGestures$ = registerSwipe({
      hookManager,
      reader,
      recognizable,
      unhandledEvent$,
      settingsManager,
    })

    merge(containerUpdate$, tapGestures$, swipeGestures$, panGestures$).pipe(takeUntil(reader.$.destroy$)).subscribe()

    return {
      ...reader,
      gestures: {
        updateSettings: settingsManager.update.bind(settingsManager),
        unhandledEvent$: unhandledEvent$.asObservable(),
        hookManager,
      },
    }
  }
