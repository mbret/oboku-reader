export { Manifest } from './types'

import { createReaderWithEnhancers as createReader, Enhancer, ReaderWithEnhancer } from './createReader'
import { createSelection } from './selection'

export type Reader = ReturnType<typeof createReader>

export {
  createReader,
  Enhancer,
  ReaderWithEnhancer
}

export type ReaderSelection = ReturnType<typeof createSelection>

export { Report } from './report'

export { composeEnhancer } from './enhancers/utils'