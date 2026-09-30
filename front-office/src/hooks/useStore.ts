import { useSyncExternalStore } from 'react'
import { getState, subscribe } from '../domain/store'
import type { AppState } from '../types/store'

// One cache entry per (state reference, selector function, args) so
// useSyncExternalStore's getSnapshot returns a STABLE reference between
// store updates — selectors in domain/selectors.ts build fresh arrays/
// objects on every call, and without this cache that would look like "a new
// value on every render" to React and either thrash or throw the
// "getSnapshot should be cached" warning. The cache is a WeakMap keyed by
// the state object itself, so it's automatically dropped the moment a new
// state replaces it (see domain/store.ts's setState).
//
// The cache holds selectors of many different argument shapes at once, so
// its key type can't preserve each selector's own tuple — TypeScript has no
// existential type for "some function with its own (state, ...args)
// signature". This is the one place that settles for `any` rather than
// widening every selector's public signature to match.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySelector = (state: AppState, ...args: any[]) => unknown
const cache = new WeakMap<AppState, Map<AnySelector, Map<string, unknown>>>()

function selectCached<TArgs extends unknown[], TResult>(
  state: AppState,
  selector: (state: AppState, ...args: TArgs) => TResult,
  args: TArgs,
): TResult {
  let bySelector = cache.get(state)
  if (!bySelector) {
    bySelector = new Map()
    cache.set(state, bySelector)
  }
  const key = selector as unknown as AnySelector
  let byArgs = bySelector.get(key)
  if (!byArgs) {
    byArgs = new Map()
    bySelector.set(key, byArgs)
  }
  const argsKey = JSON.stringify(args)
  if (!byArgs.has(argsKey)) {
    byArgs.set(argsKey, selector(state, ...args))
  }
  return byArgs.get(argsKey) as TResult
}

/** Subscribes a component to the operational store and returns
 * `selector(state, ...args)`, recomputed only when the store actually
 * changes (or `args` change). This is the only way screens read state. */
export function useStoreValue<TArgs extends unknown[], TResult>(
  selector: (state: AppState, ...args: TArgs) => TResult,
  ...args: TArgs
): TResult {
  return useSyncExternalStore(subscribe, () => selectCached(getState(), selector, args))
}
