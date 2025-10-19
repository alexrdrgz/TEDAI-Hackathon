"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowUp, Mic, Plus, BarChart3, X, Sparkles, MessageSquare } from "lucide-react"
import { VoiceOrb } from "@/components/voice-orb"
import { useSession } from "@/lib/session-context"
import { useVoiceMode } from "@/hooks/useVoiceMode"
import { getMessages, sendMessage, sendVoiceMessage, startPolling, Message, getTask, Task, deleteTask } from "@/lib/api"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { useSearchParams } from "next/navigation"

interface ChatMessage extends Message {
  id: number
}

export function ChatInterface() {
  const { chats, currentChatId, isLoading: sessionLoading, error: sessionError, createNewChat, switchChat } = useSession()
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskInitialized, setTaskInitialized] = useState(false)
  const [taskCompleted, setTaskCompleted] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const stopPollingRef = useRef<(() => void) | null>(null)
  const { toast } = useToast()

  const voice = useVoiceMode({
    onError: (err) => {
      toast({
        title: "Voice Error",
        description: err,
        variant: "destructive",
      })
    },
    onSilenceDetected: async (audioBlob) => {
      if (!currentChatId) return
      
      setIsLoading(true)
      
      try {
        const result = await sendVoiceMessage(currentChatId, audioBlob)
        
        const audioBytes = atob(result.audio)
        const audioArray = new Uint8Array(audioBytes.length)
        for (let i = 0; i < audioBytes.length; i++) {
          audioArray[i] = audioBytes.charCodeAt(i)
        }
        const responseAudioBlob = new Blob([audioArray.buffer], { type: "audio/wav" })
        
        await voice.playAudio(responseAudioBlob)
        
        // Restart VAD after response finishes
        if (isVoiceMode) {
          await voice.startVAD()
        }
      } catch (err: any) {
        console.error("Voice message error:", err)
        toast({
          title: "Error",
          description: err.message || "Failed to process voice message",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Set client-side flag after hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load task data if editing (only on client side after hydration)
  useEffect(() => {
    if (!isClient) return
    
    const taskId = searchParams.get('taskId')
    const taskType = searchParams.get('taskType')
    
    if (taskId && taskType && !taskInitialized && currentChatId) {
      setTaskInitialized(true)
      
      // Load task from backend
      getTask(taskId).then(task => {
        setEditingTask(task)
        
        // Format task details for display with full context
        let taskDetails = ''
        if (task.type === 'email') {
          taskDetails = `I need to edit this email draft:

📧 EMAIL DETAILS:
To: ${task.data.to}${task.data.cc ? `\nCC: ${task.data.cc}` : ''}${task.data.bcc ? `\nBCC: ${task.data.bcc}` : ''}
Subject: ${task.data.subject}

Body:
${task.data.body}

---
Please help me make any changes I need. When I'm satisfied with the edits, I'll ask you to send it.`
        } else if (task.type === 'calendar') {
          const startDate = new Date(task.data.startTime).toLocaleString()
          const endDate = new Date(task.data.endTime).toLocaleString()
          taskDetails = `I need to edit this calendar event:

📅 EVENT DETAILS:
Title: ${task.data.title}
Start: ${startDate}
End: ${endDate}${task.data.location ? `\nLocation: ${task.data.location}` : ''}${task.data.attendees && task.data.attendees.length > 0 ? `\nAttendees: ${task.data.attendees.join(', ')}` : ''}${task.data.description ? `\n\nDescription:\n${task.data.description}` : ''}

---
Please help me make any changes I need. When I'm satisfied with the edits, I'll ask you to create it.`
        }
        
        // Auto-send initial message
        sendMessage(currentChatId, taskDetails).catch(err => {
          toast({
            title: "Error",
            description: "Failed to initialize task editing",
            variant: "destructive",
          })
        })
      }).catch(err => {
        toast({
          title: "Error",
          description: "Failed to load task details",
          variant: "destructive",
        })
      })
    }
  }, [isClient, searchParams, currentChatId, taskInitialized, toast])

  // Load initial messages and start polling
  useEffect(() => {
    if (!currentChatId || sessionLoading) return

    const loadMessages = async () => {
      try {
        setIsInitialLoad(true)
        const initialMessages = await getMessages(currentChatId)
        setMessages(
          initialMessages.map((m) => ({
            ...m,
            id: m.id,
          }))
        )

        const lastMessageId = initialMessages.length > 0 ? Math.max(...initialMessages.map((m) => m.id)) : 0

        stopPollingRef.current = startPolling(currentChatId, lastMessageId, (newMessages) => {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const uniqueNewMessages = newMessages.filter((m) => !existingIds.has(m.id))
            
            // Check if any new message indicates task completion
            uniqueNewMessages.forEach((msg) => {
              if (msg.role === 'assistant' && editingTask && !taskCompleted) {
                const content = msg.content.toLowerCase()
                if (content.includes('✓ email prepared') || content.includes('✓ calendar event prepared')) {
                  // Tool was called successfully - delete the original editing task
                  setTaskCompleted(true)
                  deleteTask(editingTask.id).then(() => {
                    console.log('Original editing task deleted:', editingTask.id)
                    toast({
                      title: "Success!",
                      description: editingTask.type === 'email' 
                        ? "Email is ready! Gmail will open shortly." 
                        : "Event is ready! Google Calendar will open shortly.",
                    })
                  }).catch(err => {
                    console.error('Failed to delete editing task:', err)
                  })
                }
              }
            })
            
            return [
              ...prev,
              ...uniqueNewMessages.map((m) => ({
                ...m,
                id: m.id,
              })),
            ]
          })
        })
      } catch (err: any) {
        // If session not found, create a new one
        if (err.message && err.message.includes('Session not found')) {
          console.log('Session not found, creating new chat...')
          await createNewChat()
          return
        }
        
        toast({
          title: "Error",
          description: err.message || "Failed to load messages",
          variant: "destructive",
        })
        console.error(err)
      } finally {
        setIsInitialLoad(false)
      }
    }

    loadMessages()

    return () => {
      if (stopPollingRef.current) {
        stopPollingRef.current()
      }
    }
  }, [currentChatId, sessionLoading, toast])

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentChatId) return

    const userMessage = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      await sendMessage(currentChatId, userMessage)
    } catch (err: any) {
      setInput(userMessage)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceToggle = async (enabled: boolean) => {
    if (enabled) {
      if (!voice.hasPermission) {
        const granted = await voice.requestMicrophonePermission()
        if (!granted) {
          return
        }
      }
      setIsVoiceMode(true)
      // Start VAD automatically
      await voice.startVAD()
    } else {
      voice.stopVAD()
      voice.stopAudio()
      setIsVoiceMode(false)
    }
  }


  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Initializing AI Agent...</p>
        </div>
      </div>
    )
  }

  if (sessionError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="border-destructive/50 bg-destructive/10 p-6">
          <div className="text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h2 className="mb-2 text-lg font-bold">Connection Error</h2>
            <p className="mb-4 text-sm text-muted-foreground">{sessionError}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Context AI
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <Button
            onClick={createNewChat}
            className="w-full mb-4 bg-primary/80 hover:bg-primary transition-all duration-200 justify-start text-base font-medium gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>

          <div className="space-y-1">
            {chats.map((chat) => (
              <button
                key={chat.sessionId}
                onClick={() => switchChat(chat.sessionId)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-base font-medium truncate ${
                  currentChatId === chat.sessionId
                    ? 'bg-[#4493F8]/20 text-[#4493F8] border border-[#4493F8]/30'
                    : 'hover:bg-secondary text-foreground border border-transparent'
                }`}
                title={chat.title || 'New Chat'}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm">{chat.title || 'New Chat'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-2 border-t border-border">
          <Link href="/stats">
            <Button variant="ghost" className="w-full justify-start hover:bg-secondary transition-all duration-200">
              <BarChart3 className="w-4 h-4 mr-2" />
              Stats & Context
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {editingTask && !taskCompleted && (
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-3">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-500">
                Editing {editingTask.type} task
              </span>
            </div>
          </div>
        )}
        {taskCompleted && (
          <div className="bg-green-500/10 border-b border-green-500/20 px-6 py-3">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-500">
                ✓ Task prepared! {editingTask?.type === 'email' ? 'Gmail' : 'Google Calendar'} will open shortly
              </span>
            </div>
          </div>
        )}
        {isVoiceMode ? (
          <div className="flex-1 flex flex-col bg-gradient-to-b from-background to-secondary/20">
            <div className="flex justify-end p-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  voice.stopVAD()
                  await voice.stopRecording(true) // Cancel recording
                  voice.stopAudio()
                  setIsVoiceMode(false)
                }}
                className="rounded-full w-10 h-10 hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <VoiceOrb isPlaying={voice.isRecording} isSpeaking={voice.isSpeaking} isVoiceDetected={voice.isVoiceDetected} />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4 pt-8">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-3xl">💬</span>
                    </div>
                    <h2 className="text-2xl font-bold">Start a conversation</h2>
                    <p className="text-muted-foreground">I have full context of your computer activity. Ask me anything!</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <Card
                      className={cn(
                        "max-w-[70%] px-4 py-3 rounded-2xl transition-all duration-200 hover:shadow-lg",
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border-border"
                      )}
                    >
                      <p className="text-base leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
                    </Card>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-3">
                  <Card className="bg-card border-border px-4 py-3 rounded-2xl">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0.2s" }} />
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0.4s" }} />
                    </div>
                  </Card>
                </div>
              )}
              {taskCompleted && (
                <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card className="bg-green-500/10 border-green-500/30 px-4 py-4 rounded-2xl transition-all duration-200 w-full">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">✓</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-600 dark:text-green-400 mb-1">
                          {editingTask?.type === 'email' ? 'Email Ready to Send!' : 'Event Ready to Create!'}
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {editingTask?.type === 'email' 
                            ? 'Gmail will open with your email. Review and click send when ready.' 
                            : 'Google Calendar will open with your event. Review and save when ready.'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        <div className="p-6 border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-end rounded-2xl bg-secondary border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={isVoiceMode ? "Voice mode active..." : "Ask me anything..."}
                disabled={isVoiceMode || isLoading}
                rows={1}
                className="flex-1 resize-none bg-transparent border-none focus:outline-none px-5 py-4 text-sm min-h-[56px] max-h-[200px] overflow-y-auto break-words disabled:opacity-50"
              />
              <div className="flex items-center gap-2 pr-3 pb-3">
                {!input && !isVoiceMode && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleVoiceToggle(true)}
                    className="rounded-full w-10 h-10 transition-all duration-200"
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                )}
                {!isVoiceMode && (
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90 transition-all duration-200 disabled:opacity-50"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


