import { Enhancer } from "../createReader";

export const mediaEnhancer: Enhancer<{

}> = (next) => (options) => {
  const reader = next(options)

  const frameObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const frame = entry.target as HTMLIFrameElement
      const audios = Array.from(frame.contentDocument?.body.getElementsByTagName(`audio`) || [])

      if (!entry.isIntersecting) {
        audios.forEach(audioElement => {
          audioElement.pause()
          audioElement.currentTime = 0
        })
      } else {
        audios.forEach(audioElement => {
          if (audioElement.hasAttribute(`autoplay`) && audioElement.paused && audioElement.readyState >= 2) {
            audioElement.play().catch(console.error)
          }
        })
      }
    })
  }, {
    threshold: 0.01
  })

  const elementObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.target.tagName === `video`) {
        const video = entry.target as HTMLVideoElement
        if (!entry.isIntersecting) {
          video.pause()
          video.currentTime = 0
        } else {
          if (video.hasAttribute(`autoplay`)) {
            // this can fail when we play the first time due to user not having interacted with
            // document yet. Browsers policy. autoplay will play it the first time anyway.
            if (video.paused && video.readyState >= 2) {
              video.play().catch(console.error)
            }
          }
        }
      }
    })
  }, {
    threshold: 0.5
  })

  reader.registerHook(`readingItem.onLoad`, ({ frame }) => {
    frameObserver.observe(frame)

    const videos = frame.contentDocument?.body.getElementsByTagName(`video`)

    const unobserveElements = Array.from(videos || []).map(element => {
      elementObserver.observe(element)

      return () => elementObserver.unobserve(element)
    })

    return () => {
      frameObserver.unobserve(frame)
      unobserveElements.forEach(unobserve => unobserve())
    }
  })

  const destroy = () => {
    frameObserver.disconnect()
    elementObserver.disconnect()
    reader.destroy()
  }

  return {
    ...reader,
    destroy,
  }
}