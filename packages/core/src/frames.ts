export const createRemoveStyleHelper =
  (frameElement: HTMLIFrameElement | undefined) => (id: string) => {
    if (
      frameElement &&
      frameElement.contentDocument &&
      frameElement.contentDocument.head
    ) {
      const styleElement = frameElement.contentDocument.getElementById(id)
      if (styleElement) {
        styleElement.remove()
      }
    }
  }

export const createAddStyleHelper =
  (frameElement: HTMLIFrameElement | undefined) =>
  (id: string, style: string, prepend = false) => {
    if (
      frameElement &&
      frameElement.contentDocument &&
      frameElement.contentDocument.head
    ) {
      const userStyle = document.createElement(`style`)
      userStyle.id = id
      userStyle.innerHTML = style
      if (prepend) {
        frameElement.contentDocument.head.prepend(userStyle)
      } else {
        frameElement.contentDocument.head.appendChild(userStyle)
      }
    }
  }

export const getAttributeValueFromString = (string: string, key: string) => {
  const regExp = new RegExp(key + `\\s*=\\s*([0-9.]+)`, `i`)
  const match = string.match(regExp) || []
  const firstMatch = match[1] || `0`

  return (match && parseFloat(firstMatch)) || 0
}
