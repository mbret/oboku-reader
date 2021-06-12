import { Enhancer } from "../createReader";
import compose from "../utils/compose";

export type ComposeEnhancer<
A extends Enhancer<any> = Enhancer<{}>, 
B extends Enhancer<any> = Enhancer<{}>, 
C extends Enhancer<any> = Enhancer<{}>,
D extends Enhancer<any> = Enhancer<{}>,
E extends Enhancer<any> = Enhancer<{}>,
F extends Enhancer<any> = Enhancer<{}>,
G extends Enhancer<any> = Enhancer<{}>
> =
  Enhancer<
    & ReturnType<ReturnType<A>>
    & ReturnType<ReturnType<B>>
    & ReturnType<ReturnType<C>>
    & ReturnType<ReturnType<D>>
    & ReturnType<ReturnType<E>>
    & ReturnType<ReturnType<F>>
    & ReturnType<ReturnType<G>>
  >

export function composeEnhancer<A extends Enhancer<any>>(a: A): ComposeEnhancer<A>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>>(a: A, b: B): ComposeEnhancer<A, B>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>>(a: A, b: B, c: C): ComposeEnhancer<A, B, C>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>, D extends Enhancer<any>>(a: A, b: B, c: C, D: D): ComposeEnhancer<A, B, C, D>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>, D extends Enhancer<any>, E extends Enhancer<any>>(a: A, b: B, c: C, d: D, e: E): ComposeEnhancer<A, B, C, D, E>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>, D extends Enhancer<any>, E extends Enhancer<any>, F extends Enhancer<any>>(a: A, b: B, c: C, d: D, e: E, f: F): ComposeEnhancer<A, B, C, D, E, F>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>, D extends Enhancer<any>, E extends Enhancer<any>, F extends Enhancer<any>, G extends Enhancer<any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G): ComposeEnhancer<A, B, C, D, E, F, G>
export function composeEnhancer(...funcs: any[]) {
  return compose(...funcs)
}