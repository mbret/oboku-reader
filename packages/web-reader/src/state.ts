import { atom, selector } from "recoil";
import { Reader, Manifest } from "@oboku/reader";

export const bookTitleState = selector({
  key: `bookTitleState`,
  get: ({ get }) => {
    return get(manifestState)?.title
  }
})

export const bookReadyState = atom({
  key: `bookReadyState`,
  default: false
})

export const manifestState = atom<Manifest | undefined>({
  key: `manifestState`,
  default: undefined
})

export const paginationState = atom<ReturnType<Reader['getPaginationInfo']> | undefined>({
  key: `paginationState`,
  default: undefined
})

export const isComicState = selector({
  key: `isComicState`,
  get: ({ get }) => {
    const manifest = get(manifestState)

    return manifest?.renditionLayout === 'pre-paginated' || manifest?.readingOrder.every(item => item.renditionLayout === 'pre-paginated')
  }
})

export const isMenuOpenState = atom({
  key: `isMenuOpenState`,
  default: false
})