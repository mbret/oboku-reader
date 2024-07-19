import { of } from "rxjs"
import { Report } from "../../report"

export const createFrame$ = Report.measurePerformance(
  `SpineItemFrame createFrame`,
  Infinity,
  () => {
    // we force undefined because otherwise the load method will believe it's defined after this call but the code is async and
    // the iframe could be undefined later
    const frame = document.createElement(`iframe`)
    frame.frameBorder = `no`
    frame.tabIndex = 0
    frame.setAttribute(
      `sandbox`,
      `
    allow-same-origin 
    allow-scripts 
    allow-top-navigation-to-custom-protocols
  `,
    )
    frame.scrolling = `no`
    frame.style.cssText = `
    visibility: hidden;
    overflow: hidden;
    background-color: transparent;
    border: 0px none transparent;
    padding: 0px;
    transition: opacity 300ms;
    opacity: 0;
  `

    return of(frame)
  },
)
