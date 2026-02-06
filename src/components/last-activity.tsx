'use client'

import { Clock, MessageCircle, Calendar } from 'lucide-react'

interface LastActivityProps {
  timestamp: string | null | undefined
  className?: string
  showIcon?: boolean
  format?: 'relative' | 'time' | 'date' | 'full'
}

/**
 * Formats and displays last activity time
 * UX improvement: Shows relative time for recent activity
 */
export function LastActivity({ 
  timestamp, 
  className = '',
  showIcon = true,
  format = 'relative'
}: LastActivityProps) {
  if (!timestamp) return null

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  
  // Handle future dates (clock skew)
  if (diffMs < 0) return null

  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  const getRelativeTime = () => {
    if (diffMins < 1) return 'agora'
    if (diffMins < 60) return `${diffMins}min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays === 1) return 'ontem'
    if (diffDays < 7) return `${diffDays}d`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`
    return `${Math.floor(diffDays / 30)}mês`
  }

  const getTimeString = () => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getDateString = () => {
    const isToday = date.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isToday) return 'hoje'
    if (isYesterday) return 'ontem'
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  const getFullString = () => {
    return `${getDateString()} às ${getTimeString()}`
  }

  let displayText = ''
  switch (format) {
    case 'relative':
      displayText = getRelativeTime()
      break
    case 'time':
      displayText = getTimeString()
      break
    case 'date':
      displayText = getDateString()
      break
    case 'full':
      displayText = getFullString()
      break
  }

  // Determine urgency color
  const getUrgencyClass = () => {
    if (diffMins < 5) return 'text-green-600'
    if (diffMins < 30) return 'text-green-500'
    if (diffHours < 2) return 'text-amber-500'
    if (diffHours < 24) return 'text-orange-500'
    return 'text-muted-foreground'
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className} ${getUrgencyClass()}`}>
      {showIcon && <Clock className="w-2.5 h-2.5" />}
      <span>{displayText}</span>
    </span>
  )
}

/**
 * Activity status badge
 * Shows online/away status based on last activity
 */
export function ActivityStatus({ 
  lastSeen,
  className = ''
}: { 
  lastSeen: string | null | undefined
  className?: string 
}) {
  if (!lastSeen) return null

  const date = new Date(lastSeen)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  // Determine status
  const isOnline = diffMins < 5
  const isRecent = diffMins < 30
  const isActive = diffMins < 120

  if (isOnline) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-green-600 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Online
      </span>
    )
  }

  if (isRecent) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-green-500 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        Ativo agora
      </span>
    )
  }

  if (isActive) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-amber-500 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Visto há {diffMins}min
      </span>
    )
  }

  return null
}

/**
 * Compact time display for message lists
 */
export function MessageTime({ 
  timestamp,
  className = ''
}: {
  timestamp: string | null
  className?: string
}) {
  if (!timestamp) return null

  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  let displayText = ''
  if (isToday) {
    displayText = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } else if (isYesterday) {
    displayText = 'ontem'
  } else {
    displayText = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <span className={`text-[10px] text-muted-foreground ${className}`}>
      {displayText}
    </span>
  )
}
