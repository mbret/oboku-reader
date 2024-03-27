/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Func<T extends any[], R> = (...a: T) => R

/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for the
 * resulting composite function.
 *
 * @param funcs The functions to compose.
 * @returns A function obtained by composing the argument functions from right
 *   to left. For example, `compose(f, g, h)` is identical to doing
 *   `(...args) => f(g(h(...args)))`.
 */
// export default function compose(): <R>(a: R) => R

function compose<F extends Function>(f: F): F

/* two functions */
function compose<A, T extends any[], R>(f1: (a: A) => R, f2: Func<T, A>): Func<T, R>

/* three functions */
function compose<A, B, T extends any[], R>(f1: (b: B) => R, f2: (a: A) => B, f3: Func<T, A>): Func<T, R>

/* four functions */
function compose<A, B, C, T extends any[], R>(f1: (c: C) => R, f2: (b: B) => C, f3: (a: A) => B, f4: Func<T, A>): Func<T, R>

/* rest */
function compose<R>(f1: (a: any) => R, ...funcs: Function[]): (...args: any[]) => R

function compose<R>(...funcs: Function[]): (...args: any[]) => R

function compose(...funcs: Function[]) {
  if (funcs.length === 0) {
    // infer the argument type so it is usable in inference down the line
    return <T>(arg: T) => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  // return funcs.reduce((a, b) => (...args: any) => a(b(...args)))

  // compose from left-to-right instead of right-to-left. That way end user always
  // has sub enhancer as dependency
  return funcs.reduce(
    (a, b) =>
      (...args: any) =>
        b(a(...args)),
  )
}

export { compose }