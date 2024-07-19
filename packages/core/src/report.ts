/* eslint-disable @typescript-eslint/no-explicit-any */
const ROOT_NAMESPACE = `@prose-reader/core`

const getWindow = () => {
  if (typeof window === "undefined") {
    return undefined
  }

  return window
}

const wrap = (str: string) => `[${str}]`

const time = (name: string, targetDuration = 0) => {
  let tick = 0
  const t0 = performance.now()
  // const t0 = Date.now()
  // console.time(name)

  return () => {
    tick++
    const t1 = performance.now()
    // const t1 = Date.now()
    // console.timeEnd(name)
    Report.logMetric(
      { name: `${name} - tick ${tick}`, duration: t1 - t0 },
      targetDuration,
    )
  }
}

const createReport = (namespace?: string) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: (...data: any[]) => {
    if (getWindow()?.__PROSE_READER_DEBUG) {
      // eslint-disable-next-line no-console
      if (namespace) console.log(wrap(ROOT_NAMESPACE), wrap(namespace), ...data)
      else console.log(wrap(ROOT_NAMESPACE), ...data)
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...data: any[]) => {
    if (getWindow()?.__PROSE_READER_DEBUG) {
      // eslint-disable-next-line no-console
      if (namespace)
        console.warn(wrap(ROOT_NAMESPACE), wrap(namespace), ...data)
      else console.warn(wrap(ROOT_NAMESPACE), ...data)
    }
  },
  info: (...data: any[]) => {
    if (getWindow()?.__PROSE_READER_DEBUG) {
      // eslint-disable-next-line no-console
      if (namespace)
        console.info(wrap(ROOT_NAMESPACE), wrap(namespace), ...data)
      else console.info(wrap(ROOT_NAMESPACE), ...data)
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...data: any[]) => {
    // eslint-disable-next-line no-console
    console.error(...data)
  },
  // time: (label?: string | undefined) => {
  //   if (window.__PROSE_READER_DEBUG) {
  //     // eslint-disable-next-line no-console
  //     console.time(`[prose-reader] [metric] ${label}`);
  //   }
  // },
  // timeEnd: (label?: string | undefined) => {
  //   if (window.__PROSE_READER_DEBUG) {
  //     // eslint-disable-next-line no-console
  //     console.timeEnd(`[prose-reader] [metric] ${label}`);
  //   }
  // },
  time,
  logMetric: (
    performanceEntry: PerformanceEntry | { name: string; duration: number },
    targetDuration = 0,
  ) => {
    // const duration = typeof performanceEntry === 'number' ? performanceEntry : performanceEntry.duration;
    if (getWindow()?.__PROSE_READER_DEBUG) {
      if (performanceEntry.duration <= targetDuration) {
        // eslint-disable-next-line no-console
        // console.log(`[prose-reader] [metric] `, `${performanceEntry.name} took ${duration}ms`);
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `[prose-reader] [metric] `,
          `${performanceEntry.name} took ${performanceEntry.duration}ms which is above the ${targetDuration}ms target for this function`,
        )
      }
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  measurePerformance: <F extends (...args: any[]) => any>(
    name: string,
    targetDuration = 10,
    functionToMeasure: F,
    { disable }: { disable?: boolean } = {},
  ) => {
    if (disable || !getWindow()?.__PROSE_READER_DEBUG) return functionToMeasure

    return (...args: Parameters<F>): ReturnType<F> => {
      const t0 = performance.now()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = functionToMeasure(...(args as any))

      if (response && response.then) {
        return response.then((res: any) => {
          const t1 = performance.now()
          Report.logMetric({ name, duration: t1 - t0 }, targetDuration)

          return res
        })
      }

      const t1 = performance.now()

      Report.logMetric({ name, duration: t1 - t0 }, targetDuration)

      return response
    }
  },
})

export const Report = {
  ...createReport(),
  namespace: (namespace: string) => createReport(namespace),
}
