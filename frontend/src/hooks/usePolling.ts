import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'

/** Calls `fn` now and every `ms`; keeps the last good data while an error is shown. */
export function usePolling<T>(fn: () => Promise<T>, ms: number) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<ApiError>()
  const fnRef = useRef(fn)
  fnRef.current = fn

  const reload = useCallback(async () => {
    try {
      setData(await fnRef.current())
      setError(undefined)
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'Something went wrong'))
    }
  }, [])

  useEffect(() => {
    void reload()
    const t = setInterval(() => void reload(), ms)
    return () => clearInterval(t)
  }, [reload, ms])

  return { data, error, reload }
}
