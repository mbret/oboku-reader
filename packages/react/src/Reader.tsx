import React, { ReactElement, useEffect, useMemo, useRef, useState } from "react"
import ReactDOM from "react-dom"
import { Manifest, Reader as ReaderInstance, Report } from "@prose-reader/core"
import { ObservedValueOf } from "rxjs"

const report = Report.namespace("@prose-reader/react")

export type Props<Options extends object, Instance extends ReaderInstance> = {
  manifest?: Manifest
  options?: Omit<Options, "containerElement">
  loadOptions?: Parameters<Instance["load"]>[1]
  createReader: (options: Options) => Instance
  onReader?: (reader: any) => void
  onReady?: () => void
  onPaginationChange?: (pagination: ObservedValueOf<Instance["$"]["pagination$"]>) => void
  LoadingElement?: ReactElement
}

export const Reader = <Options extends object, Instance extends ReaderInstance>({
  manifest,
  onReady,
  onReader,
  loadOptions,
  options,
  onPaginationChange,
  LoadingElement,
  createReader,
}: Props<Options, Instance>) => {
  const [reader, setReader] = useState<ReturnType<typeof createReader> | undefined>(undefined)
  const [loadingElementContainers, setLoadingElementContainers] = useState<HTMLElement[]>([])
  const { width, height } = { width: `100%`, height: `100%` }
  const hasLoadingElement = !!LoadingElement
  const ref = useRef<HTMLElement>()
  const readerInitialized = useRef(false)

  useEffect(() => {
    if (!ref.current || !!reader) return

    if (readerInitialized.current) {
      report.warn(
        "One of the props relative to the reader creation has changed but the reader is already initialized. Please make sure to memoize or delay the render!"
      )

      return
    }

    if (ref.current && !reader && options) {
      readerInitialized.current = true
      const readerOptions = {
        containerElement: ref.current,
        ...(hasLoadingElement && {
          // we override loading element creator but don't do anything yet
          loadingElementCreate: ({ container }: { container: HTMLElement }) => container,
        }),
        ...options,
      }

      const newReader = createReader(readerOptions as any)

      setReader(newReader as any)
      onReader && onReader(newReader as any)
    }
  }, [setReader, onReader, reader, options, hasLoadingElement])

  useEffect(() => {
    const readerSubscription$ = reader?.$.ready$.subscribe(() => {
      onReady && onReady()
    })

    return () => {
      readerSubscription$?.unsubscribe()
    }
  }, [reader, onReady])

  useEffect(() => {
    const paginationSubscription = reader?.$.pagination$.subscribe((data) => {
      onPaginationChange && onPaginationChange(data as any)
    })

    return () => {
      paginationSubscription?.unsubscribe()
    }
  }, [onPaginationChange, reader])

  useEffect(() => {
    if (manifest && reader) {
      reader.load(manifest, loadOptions)
    }
  }, [manifest, reader, loadOptions])

  useEffect(() => {
    return () => reader?.destroy()
  }, [reader])

  useEffect(() => {
    if (hasLoadingElement && reader) {
      const subscription = reader.loading.$.items$.subscribe((entries) => {
        setLoadingElementContainers(Object.values(entries))
      })

      return () => subscription.unsubscribe()
    }
  }, [reader, hasLoadingElement])

  const style = useMemo(
    () => ({
      width,
      height,
    }),
    [height, width]
  )

  return (
    <>
      <div style={style} ref={ref as any} />
      {loadingElementContainers.map((element) => ReactDOM.createPortal(LoadingElement, element))}
    </>
  )
}
