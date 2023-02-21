import { Reader } from "@prose-reader/core"
import "hammerjs"
import {
  BehaviorSubject,
  filter,
  fromEvent,
  interval,
  map,
  merge,
  Observable,
  switchMap,
  takeUntil,
  tap,
  throttle,
  withLatestFrom,
} from "rxjs"

type Options = {
  enableFontScalePinch?: boolean
  fontScaleMin?: number
  fontScaleMax?: number
}

function inputIsNotNullOrUndefined<T>(input: null | undefined | T): input is T {
  return input !== null && input !== undefined
}

export const isNotNullOrUndefined = <T>(source$: Observable<null | undefined | T>) =>
  source$.pipe(filter(inputIsNotNullOrUndefined))

export const hammerGestureEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions & {
      hammerGesture?: {
        managerInstance?: HammerManager
      } & Options
    }
  ): InheritOutput & {
    hammerGesture: {
      setManagerInstance: (managerInstance: HammerManager) => void
    }
  } => {
    const { hammerGesture: { enableFontScalePinch, fontScaleMax = 10, fontScaleMin = 1, managerInstance } = {} } = options
    const manager$ = new BehaviorSubject<HammerManager | undefined>(managerInstance)
    const reader = next(options)

    manager$
      .pipe(
        isNotNullOrUndefined,
        switchMap((instance) => {
          const pinchStart$ = fromEvent(instance, "pinchstart").pipe(
            tap(() => {
              if (!reader?.zoom.isZooming()) {
                reader?.zoom.enter()
              }
            })
          )

          const settingsLastPinchStart$ = pinchStart$.pipe(
            withLatestFrom(reader.settings$),
            map(([, settings]) => settings)
          )

          const pinch$ = fromEvent(instance, "pinch").pipe(
            throttle(() => interval(100)),
            withLatestFrom(settingsLastPinchStart$),
            tap(([event, { fontScale: fontScaleOnPinchStart }]) => {
              if (reader?.zoom.isZooming()) {
                reader?.zoom.scale(event.scale)
              } else if (enableFontScalePinch) {
                const value = fontScaleOnPinchStart + (event.scale - 1)
                reader.setSettings({
                  fontScale: Math.max(fontScaleMin, Math.min(fontScaleMax, value)),
                })
              }
            })
          )

          const pinchEnd$ = fromEvent(instance, `pinchend`).pipe(
            tap(() => {
              if (reader?.zoom.isZooming()) {
                reader?.zoom.setCurrentScaleAsBase()
                if (reader?.zoom.isUsingScrollableZoom() && reader?.zoom.getScaleValue() <= 1) {
                  reader?.zoom.exit()
                }
              }
            })
          )

          return merge(pinchStart$, pinch$, pinchEnd$)
        }),
        takeUntil(reader.$.destroy$)
      )
      .subscribe()

    const destroy = () => {
      manager$.complete()
      reader.destroy()
    }

    return {
      ...reader,
      destroy,
      hammerGesture: {
        setManagerInstance: (instance) => manager$.next(instance),
      },
    }
  }

export const bump = 1
