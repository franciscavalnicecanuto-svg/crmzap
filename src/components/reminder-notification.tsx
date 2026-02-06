'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Clock, X, ChevronRight, Check, AlarmClockPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Reminder {
  leadId: string
  leadName: string
  phone: string
  date: string
  note?: string
}

interface ReminderNotificationProps {
  reminder: Reminder
  onDismiss: () => void
  onSnooze: (minutes: number) => void
  onComplete: () => void
  onViewLead: () => void
}

/**
 * Rich Reminder Notification
 * UX improvement: Better notification with snooze options
 */
export function ReminderNotification({
  reminder,
  onDismiss,
  onSnooze,
  onComplete,
  onViewLead,
}: ReminderNotificationProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          onDismiss()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onDismiss])

  // Play notification sound
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.volume = 0.5
    audioRef.current.play().catch(() => {})

    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const snoozeOptions = [
    { label: '15min', minutes: 15 },
    { label: '1h', minutes: 60 },
    { label: '3h', minutes: 180 },
    { label: 'Amanhã', minutes: 'tomorrow' as const },
  ]

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-bottom-4 fade-in-0 duration-300">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-white/20">
          <div 
            className="h-full bg-white/40 transition-all duration-1000 ease-linear"
            style={{ width: `${(countdown / 30) * 100}%` }}
          />
        </div>

        {/* Main content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Bell className="w-6 h-6 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-lg">Lembrete</h3>
                <button
                  onClick={onDismiss}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-white/80" />
                </button>
              </div>
              
              <p className="text-white/90 font-medium truncate">{reminder.leadName}</p>
              
              {reminder.note && (
                <p className="text-white/70 text-sm mt-1 line-clamp-2">{reminder.note}</p>
              )}

              <p className="text-white/60 text-xs mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(reminder.date).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button
              onClick={onViewLead}
              className="flex-1 bg-white text-amber-600 hover:bg-white/90 font-semibold"
            >
              Ver conversa
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            
            <Button
              onClick={onComplete}
              variant="ghost"
              className="text-white hover:bg-white/20"
              title="Marcar como feito"
            >
              <Check className="w-5 h-5" />
            </Button>
            
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              className="text-white hover:bg-white/20"
              title="Adiar"
            >
              <AlarmClockPlus className="w-5 h-5" />
            </Button>
          </div>

          {/* Snooze Options */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-white/20 animate-in slide-in-from-top-2 duration-200">
              <p className="text-white/70 text-xs mb-2">Adiar para:</p>
              <div className="flex gap-2">
                {snoozeOptions.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => {
                      if (option.minutes === 'tomorrow') {
                        // Calculate minutes until 9am tomorrow
                        const tomorrow = new Date()
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        tomorrow.setHours(9, 0, 0, 0)
                        const minutes = Math.round((tomorrow.getTime() - Date.now()) / 60000)
                        onSnooze(minutes)
                      } else {
                        onSnooze(option.minutes)
                      }
                    }}
                    className="flex-1 px-2 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs font-medium transition-colors active:scale-95"
                  >
                    +{option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Reminder Manager Hook
 * Manages reminder notifications and scheduling
 */
export function useReminderManager(
  leads: Array<{ 
    id: string
    name: string
    phone: string
    reminderDate?: string
    reminderNote?: string
  }>,
  onUpdateReminder: (leadId: string, newDate: string | undefined, note?: string) => void,
  onSelectLead: (leadId: string) => void
) {
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null)
  const notifiedRef = useRef<Set<string>>(new Set())
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check for due reminders every 30 seconds
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date()
      
      for (const lead of leads) {
        if (!lead.reminderDate) continue
        
        const reminderTime = new Date(lead.reminderDate)
        const timeDiff = reminderTime.getTime() - now.getTime()
        
        // Notify if reminder is due (within 1 minute) and not already notified
        if (timeDiff <= 60000 && timeDiff > -300000 && !notifiedRef.current.has(lead.id)) {
          notifiedRef.current.add(lead.id)
          
          setActiveReminder({
            leadId: lead.id,
            leadName: lead.name,
            phone: lead.phone,
            date: lead.reminderDate,
            note: lead.reminderNote,
          })
          
          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🔔 Lembrete: ${lead.name}`, {
              body: lead.reminderNote || 'É hora de fazer follow-up!',
              icon: '/logo.png',
              tag: `reminder-${lead.id}`,
              requireInteraction: true,
            })
          }
          
          break // Only show one at a time
        }
      }
    }

    checkReminders()
    checkIntervalRef.current = setInterval(checkReminders, 30000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [leads])

  const dismissReminder = () => {
    setActiveReminder(null)
  }

  const snoozeReminder = (minutes: number) => {
    if (!activeReminder) return
    
    const newDate = new Date(Date.now() + minutes * 60000)
    const year = newDate.getFullYear()
    const month = String(newDate.getMonth() + 1).padStart(2, '0')
    const day = String(newDate.getDate()).padStart(2, '0')
    const hours = String(newDate.getHours()).padStart(2, '0')
    const mins = String(newDate.getMinutes()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}T${hours}:${mins}`
    
    // Reset notification tracking for this lead
    notifiedRef.current.delete(activeReminder.leadId)
    
    onUpdateReminder(activeReminder.leadId, dateStr, activeReminder.note)
    setActiveReminder(null)
  }

  const completeReminder = () => {
    if (!activeReminder) return
    onUpdateReminder(activeReminder.leadId, undefined)
    setActiveReminder(null)
  }

  const viewLead = () => {
    if (!activeReminder) return
    onSelectLead(activeReminder.leadId)
    setActiveReminder(null)
  }

  return {
    activeReminder,
    dismissReminder,
    snoozeReminder,
    completeReminder,
    viewLead,
  }
}
