"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createSession, getMessages, getSessions } from './api'

interface Chat {
  sessionId: string
  title: string
  createdAt: string
  updatedAt: string
}

interface SessionContextType {
  chats: Chat[]
  currentChatId: string | null
  isLoading: boolean
  error: string | null
  createNewChat: () => Promise<void>
  switchChat: (chatId: string) => void
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize chats from localStorage and sync with API
  useEffect(() => {
    const initializeChats = async () => {
      try {
        const storedChats = localStorage.getItem('chats')
        const storedCurrentChatId = localStorage.getItem('currentChatId')

        // Try to fetch from API first
        try {
          const apiSessions = await getSessions()
          const convertedChats: Chat[] = apiSessions.map(s => ({
            sessionId: s.session_id,
            title: s.title || 'New Chat',
            createdAt: s.created_at,
            updatedAt: s.updated_at,
          }))
          
          setChats(convertedChats)
          localStorage.setItem('chats', JSON.stringify(convertedChats))
          
          if (storedCurrentChatId && convertedChats.some(c => c.sessionId === storedCurrentChatId)) {
            setCurrentChatId(storedCurrentChatId)
          } else if (convertedChats.length > 0) {
            setCurrentChatId(convertedChats[0].sessionId)
          }
        } catch (apiError) {
          // Fall back to localStorage if API fails
          if (storedChats) {
            const parsedChats = JSON.parse(storedChats) as Chat[]
            setChats(parsedChats)
            
            if (storedCurrentChatId && parsedChats.some(c => c.sessionId === storedCurrentChatId)) {
              setCurrentChatId(storedCurrentChatId)
            } else if (parsedChats.length > 0) {
              setCurrentChatId(parsedChats[0].sessionId)
            }
          } else {
            throw apiError
          }
        }

        setError(null)
      } catch (err: any) {
        // If all else fails, create a new chat
        try {
          const newSessionId = await createSession()
          const newChat: Chat = {
            sessionId: newSessionId,
            title: 'New Chat',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          setChats([newChat])
          setCurrentChatId(newSessionId)
          localStorage.setItem('chats', JSON.stringify([newChat]))
          localStorage.setItem('currentChatId', newSessionId)
          setError(null)
        } catch (createError) {
          setError('Failed to initialize chat')
          console.error(createError)
        }
      } finally {
        setIsLoading(false)
      }
    }

    initializeChats()
  }, [])

  const createNewChat = async () => {
    try {
      setIsLoading(true)
      const newSessionId = await createSession()
      const newChat: Chat = {
        sessionId: newSessionId,
        title: 'New Chat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const updatedChats = [newChat, ...chats]
      setChats(updatedChats)
      setCurrentChatId(newSessionId)
      localStorage.setItem('chats', JSON.stringify(updatedChats))
      localStorage.setItem('currentChatId', newSessionId)
      setError(null)
    } catch (err: any) {
      setError('Failed to create new chat')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const switchChat = (chatId: string) => {
    if (chats.some(c => c.sessionId === chatId)) {
      setCurrentChatId(chatId)
      localStorage.setItem('currentChatId', chatId)
    }
  }

  return (
    <SessionContext.Provider value={{ chats, currentChatId, isLoading, error, createNewChat, switchChat }}>
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
