'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Send, Bot, User, Loader2, Sparkles, MessageSquare } from 'lucide-react'

import { PageTransition } from '@/components/ui/page-transition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { toast } from '@/store/toast.store'
import * as aiApi from '@/lib/ai'

function renderAiContent(raw: string) {
  const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />')
}

function formatChatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AiAssistantPage() {
  const queryClient = useQueryClient()
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: chats = [], isLoading: isLoadingChats } = useQuery({
    queryKey: ['ai-chats'],
    queryFn: aiApi.getChats,
  })

  const { data: activeChat, isLoading: isLoadingActiveChat } = useQuery({
    queryKey: ['ai-chat', activeChatId],
    queryFn: () => aiApi.getChat(activeChatId!),
    enabled: !!activeChatId,
  })

  const createMutation = useMutation({
    mutationFn: () => aiApi.createChat('New Conversation'),
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ['ai-chats'] })
      setActiveChatId(newChat.id)
    },
    onError: () => toast.error('Failed to start a new chat'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiApi.deleteChat(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['ai-chats'] })
      if (activeChatId === deletedId) setActiveChatId(null)
    },
  })

  const sendMutation = useMutation({
    mutationFn: ({ chatId, content }: { chatId: string; content: string }) =>
      aiApi.sendMessage(chatId, content),
    onSuccess: (updatedChat) => {
      queryClient.setQueryData(['ai-chat', updatedChat.id], updatedChat)
      queryClient.invalidateQueries({ queryKey: ['ai-chats'] })
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send message'
      toast.error(message)
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat?.messages, sendMutation.isPending])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sendMutation.isPending) return
    const content = input.trim()
    setInput('')
    if (!activeChatId) {
      createMutation.mutate(undefined, {
        onSuccess: (newChat) => sendMutation.mutate({ chatId: newChat.id, content }),
      })
    } else {
      sendMutation.mutate({ chatId: activeChatId, content })
    }
  }

  const msgs = activeChat?.messages ?? []
  const msgsToShow =
    sendMutation.isPending && sendMutation.variables?.chatId === activeChatId
      ? [
          ...msgs,
          {
            id: '__pending__',
            chatId: activeChatId as string,
            role: 'USER' as aiApi.MessageRole,
            content: sendMutation.variables.content,
            createdAt: new Date().toISOString(),
          },
        ]
      : msgs

  const starterPrompts = [
    'How many active employees do we have right now?',
    'What is our current low-stock product count?',
    'Summarize pending expenses with total amount.',
  ]

  return (
    <PageTransition className="h-full min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader
          title="AI Assistant"
          subtitle="Ask questions using live ERP data"
          action={
            <Button
              onClick={() => setActiveChatId(null)}
              className="inline-flex items-center gap-2"
            >
              <Plus size={14} />
              New Chat
            </Button>
          }
        />

        {/* Unified panel */}
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">

          {/* ── Sidebar ── */}
          <aside className="flex w-[220px] shrink-0 flex-col border-r border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Chats
              </span>
              <button
                type="button"
                onClick={() => setActiveChatId(null)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/8"
              >
                <Plus size={11} />
                New
              </button>
            </div>

            <div className="scrollbar-none flex-1 overflow-y-auto py-1">
              {isLoadingChats ? (
                <div className="px-4 py-6 text-center text-[12px] text-muted">Loading…</div>
              ) : chats.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12px] text-muted">
                  No conversations yet.
                  <br />
                  Ask your first question below.
                </div>
              ) : (
                chats.map((chat) => {
                  const isActive = activeChatId === chat.id
                  return (
                    <div
                      key={chat.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setActiveChatId(chat.id); setConfirmDeleteId(null) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setActiveChatId(chat.id)
                          setConfirmDeleteId(null)
                        }
                      }}
                      className={`group relative mx-1 flex cursor-pointer items-start justify-between rounded-lg px-3 py-2.5 transition-colors ${
                        isActive
                          ? 'bg-primary/8 text-primary'
                          : 'hover:bg-canvas'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary" />
                      )}
                      <div className="min-w-0 flex-1 pl-1">
                        <p className={`truncate text-[12.5px] font-medium leading-snug ${isActive ? 'text-primary' : 'text-strong'}`}>
                          {chat.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {formatChatTime(chat.updatedAt ?? chat.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirmDeleteId === chat.id) {
                            deleteMutation.mutate(chat.id)
                            setConfirmDeleteId(null)
                          } else {
                            setConfirmDeleteId(chat.id)
                          }
                        }}
                        onBlur={() => setConfirmDeleteId(null)}
                        title={confirmDeleteId === chat.id ? 'Click again to confirm' : 'Delete'}
                        className={`ml-1 mt-0.5 shrink-0 rounded p-1 text-[11px] font-medium transition-all ${
                          confirmDeleteId === chat.id
                            ? 'bg-danger-soft text-danger'
                            : 'text-transparent group-hover:text-muted group-hover:hover:text-danger'
                        }`}
                      >
                        {confirmDeleteId === chat.id ? (
                          <span className="px-0.5">✕</span>
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </aside>

          {/* ── Chat area ── */}
          <div className="relative flex min-h-0 flex-1 flex-col bg-canvas">
            {/* Gradient wash */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/[0.06] to-transparent" />

            {/* Chat header */}
            <div className="relative z-10 flex items-center gap-3 border-b border-border bg-surface/80 px-5 py-3.5 backdrop-blur-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Bot size={16} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-strong">
                  {activeChatId ? (activeChat?.title ?? '…') : 'ERP Intelligence Copilot'}
                </p>
                <p className="text-[11px] text-muted">
                  Whitelisted tools only · Company-scoped data access
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="erp-scrollbar relative z-10 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
              {!activeChatId && !sendMutation.isPending ? (
                <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center space-y-5 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Sparkles size={26} />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[16px] font-semibold text-strong">
                      Ask anything about your company data
                    </p>
                    <p className="text-[13px] leading-relaxed text-muted">
                      I can query employee counts, low-stock alerts, and pending expense totals in real time.
                    </p>
                  </div>
                  <div className="w-full space-y-2">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => setInput(prompt)}
                        className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-left text-[12.5px] text-strong transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        <MessageSquare size={13} className="shrink-0 text-muted" />
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : isLoadingActiveChat && !sendMutation.isPending ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-muted" size={22} />
                </div>
              ) : (
                <div className="space-y-5">
                  {msgsToShow.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${msg.role === 'USER' ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          msg.role === 'USER' ? 'bg-strong text-surface' : 'bg-primary text-surface'
                        }`}
                      >
                        {msg.role === 'USER' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                          msg.role === 'USER'
                            ? 'rounded-br-sm bg-strong text-surface whitespace-pre-wrap'
                            : 'rounded-bl-sm border border-border bg-surface text-strong'
                        }`}
                      >
                        {msg.role === 'USER' ? (
                          msg.content
                        ) : (
                          <span dangerouslySetInnerHTML={{ __html: renderAiContent(msg.content) }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sendMutation.isPending && (
                <div className="mt-5 flex items-end gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-surface">
                    <Bot size={14} />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3 shadow-sm">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/50 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/90 [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="relative z-10 border-t border-border bg-surface/90 px-5 py-3.5 backdrop-blur-sm">
              <form onSubmit={handleSend} className="relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about employees, inventory, or expenses…"
                  className="rounded-full py-2.5 pr-11 text-[13px]"
                  disabled={sendMutation.isPending}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sendMutation.isPending}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-surface transition-opacity disabled:opacity-40"
                >
                  {sendMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} className="ml-0.5" />
                  )}
                </button>
              </form>
              <p className="mt-1.5 text-center text-[11px] text-muted">
                AI can make mistakes. Verify important numbers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
