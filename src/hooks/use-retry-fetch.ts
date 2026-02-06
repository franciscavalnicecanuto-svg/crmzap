'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface RetryFetchOptions {
  maxRetries?: number
  retryDelay?: number
  backoffMultiplier?: number
  onRetry?: (attempt: number, error: Error) => void
  onMaxRetriesReached?: (error: Error) => void
}

interface RetryFetchState {
  isLoading: boolean
  error: Error | null
  retryCount: number
}

/**
 * Hook for fetching with automatic retry logic
 * UX improvement: Gracefully handles network issues
 * 
 * Features:
 * - Exponential backoff
 * - Abort controller for cleanup
 * - Retry callbacks
 */
export function useRetryFetch<T>(
  fetchFn: (signal: AbortSignal) => Promise<T>,
  options: RetryFetchOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    onRetry,
    onMaxRetriesReached,
  } = options

  const [state, setState] = useState<RetryFetchState>({
    isLoading: false,
    error: null,
    retryCount: 0,
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortControllerRef.current?.abort()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const execute = useCallback(async (): Promise<T | null> => {
    // Cancel any pending request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    if (!mountedRef.current) return null

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    let lastError: Error | null = null
    let attempt = 0

    while (attempt <= maxRetries) {
      try {
        const result = await fetchFn(abortControllerRef.current.signal)
        
        if (!mountedRef.current) return null
        
        setState({
          isLoading: false,
          error: null,
          retryCount: 0,
        })
        
        return result
      } catch (error: any) {
        // Ignore abort errors
        if (error?.name === 'AbortError') {
          return null
        }

        lastError = error
        attempt++

        if (!mountedRef.current) return null

        if (attempt <= maxRetries) {
          // Calculate delay with exponential backoff
          const delay = retryDelay * Math.pow(backoffMultiplier, attempt - 1)
          
          setState(prev => ({ 
            ...prev, 
            retryCount: attempt,
            error: null // Clear error during retry
          }))
          
          onRetry?.(attempt, error)

          // Wait before retrying
          await new Promise((resolve) => {
            timeoutRef.current = setTimeout(resolve, delay)
          })
        }
      }
    }

    // Max retries reached
    if (!mountedRef.current) return null

    setState({
      isLoading: false,
      error: lastError,
      retryCount: maxRetries,
    })

    if (lastError) {
      onMaxRetriesReached?.(lastError)
    }

    return null
  }, [fetchFn, maxRetries, retryDelay, backoffMultiplier, onRetry, onMaxRetriesReached])

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setState({
      isLoading: false,
      error: null,
      retryCount: 0,
    })
  }, [])

  return {
    ...state,
    execute,
    cancel,
  }
}

/**
 * Simple fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(id)
  }
}
