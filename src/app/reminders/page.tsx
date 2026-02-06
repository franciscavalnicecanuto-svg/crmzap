'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Bell, 
  Loader2, 
  Calendar, 
  Clock, 
  User, 
  X,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Search,
  ArrowUpDown,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { getUser } from '@/lib/supabase-client'
import { SettingsNav } from '@/components/settings-nav'

interface Lead {
  id: string
  name: string
  phone: string
  status: string
  reminderDate?: string
  reminderNote?: string
  lastMessage?: string
}

type FilterType = 'all' | 'today' | 'overdue' | 'upcoming' | 'completed'

interface CompletedReminder {
  leadId: string
  leadName: string
  phone: string
  reminderDate?: string
  reminderNote?: string
  completedAt: string
}

export default function RemindersPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [completedReminders, setCompletedReminders] = useState<CompletedReminder[]>([])
  const [completingId, setCompletingId] = useState<string | null>(null) // UX: Animation state
  const [selectedIndex, setSelectedIndex] = useState(0) // UX #181: Keyboard navigation
  const searchInputRef = useRef<HTMLInputElement>(null) // UX #181: Focus search with Ctrl+K
  // UX #523: Sort options for reminders
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    async function load() {
      try {
        const { user, error } = await getUser()
        if (error || !user) {
          router.push('/login')
          return
        }
        // Load leads from localStorage
        const saved = localStorage.getItem('whatszap-leads-v3')
        if (saved) {
          setLeads(JSON.parse(saved))
        }
        // Load completed reminders history
        const completedHistory = localStorage.getItem('whatszap-completed-reminders')
        if (completedHistory) {
          setCompletedReminders(JSON.parse(completedHistory))
        }
      } catch (e) {
        console.error('Failed to load:', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [router])

  // UX #181: Keyboard shortcuts for reminders page
  // Note: filteredLeads computed later, so we access it via ref pattern
  const filteredLeadsRef = useRef<Lead[]>([])
  // Bug fix #286: Refs to prevent stale closure in keyboard handler
  const leadsRef = useRef(leads)
  const completedRemindersRef = useRef(completedReminders)
  
  // Keep refs in sync with state
  useEffect(() => { leadsRef.current = leads }, [leads])
  useEffect(() => { completedRemindersRef.current = completedReminders }, [completedReminders])
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentFiltered = filteredLeadsRef.current
      
      // Ctrl+K or Cmd+K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }
      
      // Escape to clear search or blur input
      if (e.key === 'Escape') {
        if (searchTerm) {
          setSearchTerm('')
        }
        searchInputRef.current?.blur()
        return
      }
      
      // Don't handle navigation if typing in input
      if (document.activeElement === searchInputRef.current) return
      
      // Arrow keys for navigation
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, currentFiltered.length - 1))
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      }
      
      // Enter to open selected lead
      if (e.key === 'Enter' && currentFiltered.length > 0) {
        e.preventDefault()
        const selectedLead = currentFiltered[selectedIndex]
        if (selectedLead) {
          router.push(`/dashboard?lead=${selectedLead.id}`)
        }
      }
      
      // 'd' to mark as done - Bug fix #286: Use refs to access current state
      if (e.key === 'd' && currentFiltered.length > 0) {
        e.preventDefault()
        const selectedLead = currentFiltered[selectedIndex]
        if (selectedLead) {
          // Bug fix #286: Access current state via refs to avoid stale closure
          const currentLeads = leadsRef.current
          const lead = currentLeads.find(l => l.id === selectedLead.id)
          if (lead) {
            // Inline markAsDone logic using refs for fresh state
            setCompletingId(selectedLead.id)
            
            const newCompleted: CompletedReminder = {
              leadId: lead.id,
              leadName: lead.name,
              phone: lead.phone,
              reminderDate: lead.reminderDate,
              reminderNote: lead.reminderNote,
              completedAt: new Date().toISOString()
            }
            const currentHistory = completedRemindersRef.current
            const updatedHistory = [newCompleted, ...currentHistory].slice(0, 50)
            setCompletedReminders(updatedHistory)
            localStorage.setItem('whatszap-completed-reminders', JSON.stringify(updatedHistory))
            
            if ('vibrate' in navigator) navigator.vibrate([10, 30, 10])
            
            setTimeout(() => {
              clearReminder(selectedLead.id)
              setCompletingId(null)
            }, 400)
          }
        }
      }
      
      // UX #700: Keyboard snooze shortcuts (1=30m, 2=1h, 3=3h, 4=tomorrow, 5=monday)
      // Bug fix #625: Don't trigger snooze when typing in search input
      const snoozeMap: Record<string, { ms: number | 'tomorrow' | 'monday', label: string }> = {
        '1': { ms: 30 * 60 * 1000, label: '30 minutos' },
        '2': { ms: 60 * 60 * 1000, label: '1 hora' },
        '3': { ms: 3 * 60 * 60 * 1000, label: '3 horas' },
        '4': { ms: 'tomorrow', label: 'amanhã às 9h' },
        '5': { ms: 'monday', label: 'segunda às 9h' },
      }
      
      // Bug fix #625: Skip snooze shortcuts if typing in search input
      if (document.activeElement === searchInputRef.current) return
      
      if (snoozeMap[e.key] && currentFiltered.length > 0) {
        e.preventDefault()
        const selectedLead = currentFiltered[selectedIndex]
        if (selectedLead) {
          const currentLeads = leadsRef.current
          const lead = currentLeads.find(l => l.id === selectedLead.id)
          if (lead?.reminderDate) {
            const option = snoozeMap[e.key]
            let targetDate: Date
            
            if (option.ms === 'tomorrow') {
              targetDate = new Date()
              targetDate.setDate(targetDate.getDate() + 1)
              targetDate.setHours(9, 0, 0, 0)
            } else if (option.ms === 'monday') {
              const today = new Date()
              const daysUntilMonday = today.getDay() === 1 ? 7 : (8 - today.getDay()) % 7 || 7
              targetDate = new Date(today)
              targetDate.setDate(today.getDate() + daysUntilMonday)
              targetDate.setHours(9, 0, 0, 0)
            } else {
              targetDate = new Date(Date.now() + option.ms)
            }
            
            // Format as local ISO string
            const year = targetDate.getFullYear()
            const month = String(targetDate.getMonth() + 1).padStart(2, '0')
            const day = String(targetDate.getDate()).padStart(2, '0')
            const hours = String(targetDate.getHours()).padStart(2, '0')
            const minutes = String(targetDate.getMinutes()).padStart(2, '0')
            const newDate = `${year}-${month}-${day}T${hours}:${minutes}`
            
            const updated = currentLeads.map(l => 
              l.id === lead.id ? { ...l, reminderDate: newDate } : l
            )
            setLeads(updated)
            localStorage.setItem('whatszap-leads-v3', JSON.stringify(updated))
            
            // Visual + haptic feedback
            if ('vibrate' in navigator) navigator.vibrate([10, 20, 10])
            
            // Show brief toast-like feedback via temporary CSS class
            const card = document.querySelector(`[data-reminder-id="${lead.id}"]`)
            if (card) {
              card.classList.add('snooze-success')
              setTimeout(() => card.classList.remove('snooze-success'), 600)
            }
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchTerm, selectedIndex, router])
  
  // Bug fix #193: Reset selected index when filtered results change
  // Also clamp to valid range to prevent out-of-bounds access
  // Note: Uses ref pattern since filteredLeads is computed later
  useEffect(() => {
    setSelectedIndex(prev => {
      const maxIndex = filteredLeadsRef.current.length - 1
      if (maxIndex < 0) return 0
      return Math.min(prev, maxIndex)
    })
  }, [filter, searchTerm, leads]) // Added leads dependency to catch markAsDone changes

  // Bug fix #283: Also remove from notified reminders to allow re-scheduling
  const clearReminder = (leadId: string) => {
    const updated = leads.map(l => 
      l.id === leadId ? { ...l, reminderDate: undefined, reminderNote: undefined } : l
    )
    setLeads(updated)
    localStorage.setItem('whatszap-leads-v3', JSON.stringify(updated))
    
    // Bug fix #283: Remove from notified set so user can reschedule same lead
    try {
      const notifiedKey = 'whatszap-notified-reminders'
      const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]')
      const filtered = notified.filter((id: string) => id !== leadId)
      localStorage.setItem(notifiedKey, JSON.stringify(filtered))
    } catch (e) {
      console.error('Failed to clear notified reminder:', e)
    }
  }

  // Bug fix: markAsDone now records completion before clearing
  // UX #126: Added toast feedback for completed reminders
  // UX improvement: Animation on completion
  // Bug fix #400: Safety timeout to prevent stuck completing state
  const completingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const markAsDone = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId)
    if (lead) {
      // Clear any existing timeout to prevent race conditions
      if (completingTimeoutRef.current) {
        clearTimeout(completingTimeoutRef.current)
      }
      
      // Trigger completion animation
      setCompletingId(leadId)
      
      // Save to completed reminders history
      const newCompleted: CompletedReminder = {
        leadId: lead.id,
        leadName: lead.name,
        phone: lead.phone,
        reminderDate: lead.reminderDate,
        reminderNote: lead.reminderNote,
        completedAt: new Date().toISOString()
      }
      const updatedHistory = [newCompleted, ...completedReminders].slice(0, 50)
      setCompletedReminders(updatedHistory)
      localStorage.setItem('whatszap-completed-reminders', JSON.stringify(updatedHistory))
      
      // Haptic feedback
      if ('vibrate' in navigator) navigator.vibrate([10, 30, 10])
      
      // Delay removal for animation with safety timeout
      completingTimeoutRef.current = setTimeout(() => {
        clearReminder(leadId)
        setCompletingId(null)
        completingTimeoutRef.current = null
      }, 400)
    }
  }
  
  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (completingTimeoutRef.current) {
        clearTimeout(completingTimeoutRef.current)
      }
    }
  }, [])
  
  // UX #127: Bulk actions for reminders
  // Bug fix #51: Batch localStorage operations (read once, write once)
  const markAllOverdueAsDone = () => {
    const overdueLeads = filteredLeads.filter(l => getReminderStatus(l.reminderDate!) === 'overdue')
    if (overdueLeads.length === 0) return
    
    // Read history once, add all entries, write once
    const history = JSON.parse(localStorage.getItem('whatszap-completed-reminders') || '[]')
    const completedAt = new Date().toISOString()
    
    const newEntries = overdueLeads.map(lead => ({
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
      reminderDate: lead.reminderDate,
      reminderNote: lead.reminderNote,
      completedAt
    }))
    
    // Prepend all new entries and keep only last 50
    const updatedHistory = [...newEntries, ...history].slice(0, 50)
    localStorage.setItem('whatszap-completed-reminders', JSON.stringify(updatedHistory))
    
    // Clear all overdue reminders
    const updated = leads.map(l => 
      overdueLeads.some(ol => ol.id === l.id) 
        ? { ...l, reminderDate: undefined, reminderNote: undefined } 
        : l
    )
    setLeads(updated)
    localStorage.setItem('whatszap-leads-v3', JSON.stringify(updated))
    
    // Bug fix #283: Also clear notified reminders
    try {
      const notifiedKey = 'whatszap-notified-reminders'
      const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]')
      const overdueIds = new Set(overdueLeads.map(l => l.id))
      const filtered = notified.filter((id: string) => !overdueIds.has(id))
      localStorage.setItem(notifiedKey, JSON.stringify(filtered))
    } catch (e) {
      console.error('Failed to clear notified reminders:', e)
    }
    
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate([10, 50, 10, 50, 10])
  }

  // Filter leads with reminders
  const leadsWithReminders = leads.filter(l => l.reminderDate)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  const getFilteredLeads = () => {
    let filtered = leadsWithReminders

    // Apply search (Bug fix: normalize phone search)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const termDigits = term.replace(/\D/g, '')
      filtered = filtered.filter(l => 
        l.name.toLowerCase().includes(term) || 
        l.phone.replace(/\D/g, '').includes(termDigits) ||
        l.reminderNote?.toLowerCase().includes(term)
      )
    }

    // Apply filter (Bug fix: today and overdue are now mutually exclusive)
    switch (filter) {
      case 'today':
        // Today: reminders scheduled for today that haven't passed yet
        filtered = filtered.filter(l => {
          const d = new Date(l.reminderDate!)
          return d >= now && d < tomorrow
        })
        break
      case 'overdue':
        // Overdue: reminders that have passed (before now, not just before today)
        filtered = filtered.filter(l => new Date(l.reminderDate!) < now)
        break
      case 'upcoming':
        // Upcoming: reminders for tomorrow onwards
        filtered = filtered.filter(l => new Date(l.reminderDate!) >= tomorrow)
        break
    }

    // UX #523: Sort by selected criteria
    return filtered.sort((a, b) => {
      let comparison = 0
      
      if (sortBy === 'date') {
        comparison = new Date(a.reminderDate!).getTime() - new Date(b.reminderDate!).getTime()
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  const filteredLeads = getFilteredLeads()
  
  // UX #181: Keep ref in sync for keyboard navigation
  filteredLeadsRef.current = filteredLeads

  // Stats (Bug fix: mutually exclusive counts)
  // UX improvement: Added completed count for last 7 days
  const stats = {
    total: leadsWithReminders.length,
    today: leadsWithReminders.filter(l => {
      const d = new Date(l.reminderDate!)
      return d >= now && d < tomorrow // Today and not yet passed
    }).length,
    overdue: leadsWithReminders.filter(l => new Date(l.reminderDate!) < now).length, // Passed
    upcoming: leadsWithReminders.filter(l => new Date(l.reminderDate!) >= tomorrow).length, // Tomorrow+
    completed: completedReminders.filter(r => {
      const completedDate = new Date(r.completedAt)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return completedDate >= sevenDaysAgo
    }).length,
  }

  const getReminderStatus = (dateStr: string) => {
    const date = new Date(dateStr)
    if (date < now) return 'overdue'
    // UX #206: Urgent status for reminders in next 30 minutes
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000)
    if (date >= now && date <= thirtyMinutesFromNow) return 'urgent'
    if (date >= today && date < tomorrow) return 'today'
    return 'upcoming'
  }
  
  // UX #401: Get countdown for urgent reminders
  const getCountdown = (dateStr: string): string | null => {
    const date = new Date(dateStr)
    const diffMs = date.getTime() - Date.now()
    
    if (diffMs <= 0 || diffMs > 30 * 60 * 1000) return null // Only for next 30 min
    
    const mins = Math.floor(diffMs / 60000)
    const secs = Math.floor((diffMs % 60000) / 1000)
    
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs.toString().padStart(2, '0')}s`
  }
  
  // UX #401: Auto-update countdown every second for urgent reminders
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const hasUrgent = filteredLeadsRef.current.some(l => getReminderStatus(l.reminderDate!) === 'urgent')
    if (!hasUrgent) return
    
    const interval = setInterval(() => {
      forceUpdate(n => n + 1)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [filter, searchTerm, leads])

  const formatReminderDate = (dateStr: string) => {
    const date = new Date(dateStr)
    // Bug fix #16: Distinguish between "today but passed" vs "today upcoming"
    // Bug fix #112: Show more detail for reminders that passed more than 1 day ago
    const isTodayPassed = date >= today && date < now
    const isTodayUpcoming = date >= now && date < tomorrow
    const isTomorrow = date >= tomorrow && date < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const isYesterday = date >= yesterday && date < today
    
    if (isTodayPassed) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (passou)`
    }
    if (isTodayUpcoming) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    }
    if (isTomorrow) {
      return `Amanhã às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    }
    // Bug fix #112: Show "Ontem" for yesterday's reminders
    if (isYesterday) {
      return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (atrasado)`
    }
    // Bug fix #16 & #112: Show how many days ago for older reminders
    if (date < now) {
      const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      const dateFormatted = date.toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
      })
      if (daysAgo >= 7) {
        return `${dateFormatted} (${Math.floor(daysAgo / 7)} semana${daysAgo >= 14 ? 's' : ''} atrás)`
      }
      return `${dateFormatted} (${daysAgo} dia${daysAgo > 1 ? 's' : ''} atrás)`
    }
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <h1 className="font-semibold">Lembretes</h1>
          </div>
        </div>
      </header>

      <SettingsNav />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          <button 
            onClick={() => setFilter('all')}
            className={`p-3 rounded-lg border text-center transition focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              filter === 'all' ? 'border-amber-500 bg-amber-50' : 'hover:bg-muted/50'
            }`}
            aria-pressed={filter === 'all'}
          >
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </button>
          <button 
            onClick={() => setFilter('overdue')}
            className={`p-3 rounded-lg border text-center transition focus:outline-none focus:ring-2 focus:ring-red-500 ${
              filter === 'overdue' ? 'border-red-500 bg-red-50' : 'hover:bg-muted/50'
            }`}
            aria-pressed={filter === 'overdue'}
          >
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-xs text-muted-foreground">Atrasados</div>
          </button>
          <button 
            onClick={() => setFilter('today')}
            className={`p-3 rounded-lg border text-center transition focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              filter === 'today' ? 'border-amber-500 bg-amber-50' : 'hover:bg-muted/50'
            }`}
            aria-pressed={filter === 'today'}
          >
            <div className="text-2xl font-bold text-amber-600">{stats.today}</div>
            <div className="text-xs text-muted-foreground">Hoje</div>
          </button>
          <button 
            onClick={() => setFilter('upcoming')}
            className={`p-3 rounded-lg border text-center transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              filter === 'upcoming' ? 'border-blue-500 bg-blue-50' : 'hover:bg-muted/50'
            }`}
            aria-pressed={filter === 'upcoming'}
          >
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            <div className="text-xs text-muted-foreground">Próximos</div>
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={`p-3 rounded-lg border text-center transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
              filter === 'completed' ? 'border-green-500 bg-green-50' : 'hover:bg-muted/50'
            }`}
            aria-pressed={filter === 'completed'}
          >
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Feitos (7d)</div>
          </button>
        </div>
        
        {/* UX #128: Bulk action for overdue reminders */}
        {filter === 'overdue' && stats.overdue > 1 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{stats.overdue} lembretes atrasados</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
              onClick={markAllOverdueAsDone}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Marcar todos como feito
            </Button>
          </div>
        )}

        {/* Search - UX #181: Added keyboard shortcut hint */}
        {/* UX #523: Added sort controls */}
        <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              ref={searchInputRef}
              placeholder="Buscar por nome, telefone ou nota... (Ctrl+K)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center"
                title="Limpar (Escape)"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
          {/* Sort controls */}
          <div className="flex items-center gap-1">
            <Button
              variant={sortBy === 'date' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                if (sortBy === 'date') {
                  setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                } else {
                  setSortBy('date')
                  setSortDirection('asc')
                }
              }}
              title="Ordenar por data"
            >
              <Clock className="w-3 h-3 mr-1" />
              Data
              {sortBy === 'date' && (
                sortDirection === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
              )}
            </Button>
            <Button
              variant={sortBy === 'name' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                if (sortBy === 'name') {
                  setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                } else {
                  setSortBy('name')
                  setSortDirection('asc')
                }
              }}
              title="Ordenar por nome"
            >
              <User className="w-3 h-3 mr-1" />
              Nome
              {sortBy === 'name' && (
                sortDirection === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
              )}
            </Button>
          </div>
        </div>
        
        {/* UX #181: Keyboard shortcuts hint - UX #700: Added snooze shortcuts */}
        {filteredLeads.length > 0 && (
          <div className="text-[10px] text-muted-foreground mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">↑↓</kbd> navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Enter</kbd> abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">D</kbd> feito
            </span>
            <span className="hidden sm:flex items-center gap-1 text-blue-600">
              <kbd className="px-1 py-0.5 bg-blue-50 rounded text-[9px] border border-blue-200">1-5</kbd> adiar
            </span>
          </div>
        )}

        {/* UX #131: Quick create reminder section */}
        {leadsWithReminders.length > 0 && (
          <div className="mb-6 p-4 border border-dashed border-amber-300 rounded-lg bg-amber-50/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Precisa lembrar de algo?</p>
                <p className="text-xs text-muted-foreground">Crie lembretes no dashboard clicando no sino em qualquer lead</p>
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                Ir para Dashboard
              </Button>
            </Link>
          </div>
        )}

        {/* Completed Reminders List (when filter is "completed") */}
        {/* Bug fix #207: Filter completed reminders by 7 days to match stats.completed count */}
        {filter === 'completed' && (
          <div className="space-y-3">
            {(() => {
              const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              const filteredCompleted = completedReminders.filter(r => 
                new Date(r.completedAt) >= sevenDaysAgo
              )
              return filteredCompleted.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <h2 className="text-lg font-medium mb-1">Nenhum lembrete completado</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Quando você marcar lembretes como feitos, eles aparecerão aqui
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>{filteredCompleted.length} lembrete{filteredCompleted.length !== 1 ? 's' : ''} completado{filteredCompleted.length !== 1 ? 's' : ''} (últimos 7 dias)</span>
                  <button
                    onClick={() => {
                      setCompletedReminders([])
                      localStorage.setItem('whatszap-completed-reminders', '[]')
                    }}
                    className="text-xs text-red-500 hover:text-red-600 transition"
                  >
                    Limpar histórico
                  </button>
                </div>
                {filteredCompleted.map((reminder, idx) => (
                  <Card 
                    key={`completed-${reminder.leadId}-${idx}`}
                    className="p-4 bg-green-50/30 border-green-200/50"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-full bg-green-100">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{reminder.leadName}</h3>
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                            Completado
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                          📅 Original: {reminder.reminderDate ? new Date(reminder.reminderDate).toLocaleString('pt-BR', { 
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                          }) : 'N/A'}
                        </div>
                        <div className="text-sm text-green-600">
                          ✓ Feito em: {new Date(reminder.completedAt).toLocaleString('pt-BR', { 
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                          })}
                        </div>
                        {reminder.reminderNote && (
                          <p className="text-sm text-muted-foreground mt-1">
                            📝 {reminder.reminderNote}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )
            })()}
          </div>
        )}

        {/* Reminders List (active reminders) */}
        {filter !== 'completed' && filteredLeads.length === 0 ? (
          <div className="text-center py-16">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              leadsWithReminders.length === 0 
                ? 'bg-amber-100' 
                : searchTerm 
                  ? 'bg-blue-100' 
                  : 'bg-gray-100'
            }`}>
              {searchTerm ? (
                <Search className="w-8 h-8 text-blue-400" />
              ) : (
                <Bell className={`w-8 h-8 ${leadsWithReminders.length === 0 ? 'text-amber-400' : 'text-gray-400'}`} />
              )}
            </div>
            <h2 className="text-lg font-medium mb-1">
              {leadsWithReminders.length === 0 
                ? 'Nenhum lembrete agendado' 
                : searchTerm 
                  ? `Nenhum resultado para "${searchTerm}"`
                  : filter === 'today' 
                    ? 'Nenhum lembrete para hoje'
                    : filter === 'overdue'
                      ? '🎉 Nenhum lembrete atrasado!'
                      : filter === 'upcoming'
                        ? 'Nenhum lembrete futuro'
                        : 'Nenhum lembrete encontrado'}
            </h2>
            <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto">
              {leadsWithReminders.length === 0 
                ? 'Crie lembretes no dashboard para não esquecer de fazer follow-up com seus leads'
                : searchTerm 
                  ? 'Tente buscar por outro nome ou nota'
                  : filter === 'overdue'
                    ? 'Todos os seus lembretes estão em dia! Continue assim.'
                    : 'Tente ajustar os filtros para ver outros lembretes'}
            </p>
            <div className="flex gap-2 justify-center">
              {(searchTerm || filter !== 'all') && (
                <Button variant="outline" onClick={() => { setSearchTerm(''); setFilter('all') }}>
                  <X className="w-3 h-3 mr-1" />
                  Limpar filtros
                </Button>
              )}
              <Link href="/dashboard">
                <Button>Ir para o Dashboard</Button>
              </Link>
            </div>
          </div>
        ) : filter !== 'completed' && (
          <div className="space-y-3">
            {filteredLeads.map((lead, index) => {
              const status = getReminderStatus(lead.reminderDate!)
              const isSelected = index === selectedIndex
              return (
                <Card 
                  key={lead.id}
                  data-reminder-id={lead.id}
                  className={`p-4 transition-all hover:shadow-md cursor-pointer ${
                    completingId === lead.id 
                      ? 'reminder-completing' 
                      : 'opacity-100 scale-100 translate-x-0 duration-200'
                  } ${
                    isSelected 
                      ? 'ring-2 ring-green-500 shadow-md keyboard-focused' 
                      : ''
                  } ${
                    status === 'overdue' ? 'border-red-300 bg-red-50/50' :
                    status === 'urgent' ? 'border-orange-400 bg-orange-50/50 urgent-reminder-pulse' :
                    status === 'today' ? 'border-amber-300 bg-amber-50/50' :
                    ''
                  }`}
                  onClick={() => router.push(`/dashboard?lead=${lead.id}`)}
                  tabIndex={0}
                  onFocus={() => setSelectedIndex(index)}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={`p-2 rounded-full ${
                      status === 'overdue' ? 'bg-red-100' :
                      status === 'urgent' ? 'bg-orange-100 animate-pulse' :
                      status === 'today' ? 'bg-amber-100' :
                      'bg-blue-100'
                    }`}>
                      {status === 'overdue' ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      ) : status === 'urgent' ? (
                        <Bell className="w-5 h-5 text-orange-600" />
                      ) : (
                        <Clock className={`w-5 h-5 ${
                          status === 'today' ? 'text-amber-600' : 'text-blue-600'
                        }`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{lead.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {lead.phone}
                        </Badge>
                      </div>
                      
                      <div className={`text-sm font-medium mb-1 flex items-center gap-2 ${
                        status === 'overdue' ? 'text-red-600' :
                        status === 'urgent' ? 'text-orange-600' :
                        status === 'today' ? 'text-amber-600' :
                        'text-blue-600'
                      }`}>
                        <span>
                          {status === 'urgent' && <span className="mr-1">⚡</span>}
                          {formatReminderDate(lead.reminderDate!)}
                        </span>
                        {/* UX #401: Live countdown for urgent reminders */}
                        {status === 'urgent' && getCountdown(lead.reminderDate!) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold animate-pulse">
                            ⏱️ {getCountdown(lead.reminderDate!)}
                          </span>
                        )}
                      </div>
                      
                      {lead.reminderNote && (
                        <p className="text-sm text-muted-foreground">
                          📝 {lead.reminderNote}
                        </p>
                      )}
                      
                      {lead.lastMessage && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Última msg: "{lead.lastMessage}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* UX #78/#82/#95/#222: Quick Snooze buttons for all reminders */}
                      {/* Bug fix #95: Use local timezone-aware date formatting instead of toISOString() */}
                      {/* Bug fix #99: Moved helper functions outside render loop for better performance */}
                      {/* UX #222: Added snooze for today/upcoming reminders too (only +1h, +1d) */}
                      {(status === 'today' || status === 'upcoming' || status === 'urgent') && (
                        <div className="flex items-center gap-1">
                          {[
                            { label: '+1h', ms: 60 * 60 * 1000, title: 'Adiar 1 hora' },
                            { label: '+1d', ms: 24 * 60 * 60 * 1000, title: 'Adiar 1 dia' },
                          ].map((option) => (
                            <Button
                              key={option.label}
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 h-7 text-xs active:scale-95 transition-transform snooze-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                const currentDate = new Date(lead.reminderDate!)
                                const targetDate = new Date(currentDate.getTime() + option.ms)
                                
                                // Format as local ISO string
                                const year = targetDate.getFullYear()
                                const month = String(targetDate.getMonth() + 1).padStart(2, '0')
                                const day = String(targetDate.getDate()).padStart(2, '0')
                                const hours = String(targetDate.getHours()).padStart(2, '0')
                                const minutes = String(targetDate.getMinutes()).padStart(2, '0')
                                const newDate = `${year}-${month}-${day}T${hours}:${minutes}`
                                
                                const updated = leads.map(l => 
                                  l.id === lead.id ? { ...l, reminderDate: newDate, reminderNote: l.reminderNote } : l
                                )
                                setLeads(updated)
                                localStorage.setItem('whatszap-leads-v3', JSON.stringify(updated))
                                // Haptic + visual feedback
                                if ('vibrate' in navigator) navigator.vibrate([10, 20, 10])
                                const card = document.querySelector(`[data-reminder-id="${lead.id}"]`)
                                if (card) {
                                  card.classList.add('snooze-success')
                                  setTimeout(() => card.classList.remove('snooze-success'), 600)
                                }
                              }}
                              title={option.title}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      )}
                      {status === 'overdue' && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Bug fix #83: Dynamic Monday label - shows "Próx. Seg" if today is Monday */}
                          {(() => {
                            const isMonday = new Date().getDay() === 1
                            return [
                              { label: '30m', ms: 30 * 60 * 1000, title: 'Adiar 30 minutos' },
                              { label: '1h', ms: 60 * 60 * 1000, title: 'Adiar 1 hora' },
                              { label: '3h', ms: 3 * 60 * 60 * 1000, title: 'Adiar 3 horas' },
                              { label: 'Amanhã', ms: 'tomorrow' as const, title: 'Amanhã às 9h' },
                              { label: isMonday ? 'Próx Seg' : 'Seg', ms: 'monday' as const, title: isMonday ? 'Próxima segunda às 9h' : 'Segunda às 9h' },
                            ].map((option) => (
                            <Button
                              key={option.label}
                              variant="ghost"
                              size="sm"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 h-7 text-xs active:scale-95 transition-transform snooze-btn"
                              onClick={(e) => {
                                e.stopPropagation() // Bug fix #84: Prevent card click when clicking snooze
                                let targetDate: Date
                                if (option.ms === 'tomorrow') {
                                  targetDate = new Date()
                                  targetDate.setDate(targetDate.getDate() + 1)
                                  targetDate.setHours(9, 0, 0, 0)
                                } else if (option.ms === 'monday') {
                                  const today = new Date()
                                  // Bug fix #83: If today is Monday, go to NEXT Monday (7 days), not "this Monday"
                                  const daysUntilMonday = today.getDay() === 1 ? 7 : (8 - today.getDay()) % 7 || 7
                                  targetDate = new Date(today)
                                  targetDate.setDate(today.getDate() + daysUntilMonday)
                                  targetDate.setHours(9, 0, 0, 0)
                                } else {
                                  targetDate = new Date(Date.now() + option.ms)
                                }
                                
                                // Format as local ISO string
                                const year = targetDate.getFullYear()
                                const month = String(targetDate.getMonth() + 1).padStart(2, '0')
                                const day = String(targetDate.getDate()).padStart(2, '0')
                                const hours = String(targetDate.getHours()).padStart(2, '0')
                                const minutes = String(targetDate.getMinutes()).padStart(2, '0')
                                const newDate = `${year}-${month}-${day}T${hours}:${minutes}`
                                
                                // Bug fix #156: Preserve reminderNote when snoozing
                                const updated = leads.map(l => 
                                  l.id === lead.id ? { ...l, reminderDate: newDate, reminderNote: l.reminderNote } : l
                                )
                                setLeads(updated)
                                localStorage.setItem('whatszap-leads-v3', JSON.stringify(updated))
                                // Haptic feedback + visual animation
                                if ('vibrate' in navigator) navigator.vibrate([10, 20, 10])
                                // UX #701: Visual feedback on snooze
                                const card = document.querySelector(`[data-reminder-id="${lead.id}"]`)
                                if (card) {
                                  card.classList.add('snooze-success')
                                  setTimeout(() => card.classList.remove('snooze-success'), 600)
                                }
                              }}
                              title={option.title}
                            >
                              +{option.label}
                            </Button>
                          ))
                          })()}
                        </div>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => markAsDone(lead.id)}
                        title="Marcar como feito"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => clearReminder(lead.id)}
                        title="Remover lembrete"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Link href={`/dashboard?lead=${lead.id}`}>
                        <Button variant="outline" size="sm" title="Abrir no dashboard">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
