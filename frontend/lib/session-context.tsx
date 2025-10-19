"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createSession } from './api'

interface SessionContextType {
  sessionId: string | null
  isLoading: boolean
  error: string | null
  createNewSession: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const storedSessionId = localStorage.getItem('chatSessionId')

        if (storedSessionId) {
          setSessionId(storedSessionId)
        } else {
          const newSessionId = await createSession()
          localStorage.setItem('chatSessionId', newSessionId)
          setSessionId(newSessionId)
        }
        setError(null)
      } catch (err: any) {
        setError('Failed to initialize chat session')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [])

  const createNewSession = async () => {
    try {
      setIsLoading(true)
      const newSessionId = await createSession()
      localStorage.setItem('chatSessionId', newSessionId)
      setSessionId(newSessionId)
      setError(null)
    } catch (err: any) {
      setError('Failed to create new session')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SessionContext.Provider value={{ sessionId, isLoading, error, createNewSession }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
