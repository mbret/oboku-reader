import { Enhancer } from "../createReader";

export const hotkeysEnhancer: Enhancer<{}> = (next) => (options) => {
  const reader = next(options)

  const onKeyPress = (e: KeyboardEvent) => {
    console.log(e.key)
    if (e.key === `ArrowRight`) {
      reader.turnRight()
    }

    if (e.key === `ArrowLeft`) {
      reader.turnLeft()
    }
  }

  document.addEventListener(`keyup`, onKeyPress)

  reader.registerHook(`readingItem.onLoad`, ({ frame }) => {
    frame.contentDocument?.addEventListener(`keyup`, onKeyPress)

    return () => {
      frame.contentDocument?.removeEventListener(`keyup`, onKeyPress)
    }
  })

  const destroy = () => {
    document.removeEventListener(`keyup`, onKeyPress)
    reader.destroy()
  }

  return {
    ...reader,
    destroy,
  }
}