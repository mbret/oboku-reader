export const __UNSAFE_REFERENCE_ORIGINAL_IFRAME_EVENT_KEY = `__UNSAFE_REFERENCE_ORIGINAL_IFRAME_EVENT`

export const attachOriginalFrameEventToDocumentEvent = <E extends Event>(
  event: E,
  frameEvent: E,
) => {
  Object.defineProperty(event, __UNSAFE_REFERENCE_ORIGINAL_IFRAME_EVENT_KEY, {
    value: frameEvent,
    enumerable: true,
  })
}

export const getOriginalFrameEventFromDocumentEvent = <E extends Event>(
  event: E,
): E | undefined => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return event[__UNSAFE_REFERENCE_ORIGINAL_IFRAME_EVENT_KEY]
}
