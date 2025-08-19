import { useState, useEffect, useCallback } from 'react'

export function useLocalStorageState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(state))
    }
  }, [key, state])

  const setLocalStorageState = (value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(newValue))
      }
      return newValue
    })
  }

  return [state, setLocalStorageState]
}

export function useToggleState(key: string): [Record<string, boolean>, (id: string) => void] {
  const [state, setState] = useLocalStorageState<Record<string, boolean>>(key, {})
  const toggle = useCallback((id: string) => {
    setState((prev: Record<string, boolean>) => {
      const newState: Record<string, boolean> = { ...prev, [id]: !prev[id] }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(newState))
      }
      return newState
    })
  }, [key, setState])
  return [state, toggle]
}
