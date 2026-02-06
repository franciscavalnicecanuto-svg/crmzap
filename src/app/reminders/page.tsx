'use client'

import { useEffect, useState } from 'react'
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
  ChevronRight
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

type FilterType = 'all' | 'today' | 'overdue' | 'upcoming'

export default function RemindersPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchTerm, setSearchTerm] = useState('')

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
      } catch (e) {
        console.error('Failed to load:', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [router])

  const clearReminder = (leadId: string) => {
    const updated = leads.map(l => 
      l.id === leadId ? { ...l, reminderDate: undefined, reminderNote: undefined } : l
    )
    setLeads(updated)
    localStorage.setItem('whatszap-leads-v3', JSON.stringify(updated))
  }

  // Bug fix: markAsDone now records completion before clearing
  const markAsDone = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId)
    if (lead) {
      // Save to completed reminders history
      const history = JSON.parse(localStorage.getItem('whatszap-completed-reminders') || '[]')
      history.unshift({
        leadId: lead.id,
        leadName: lead.name,
        phone: lead.phone,
        reminderDate: lead.reminderDate,
        reminderNote: lead.reminderNote,
        completedAt: new Date().toISOString()
      })
      // Keep only last 50 completed reminders
      localStorage.setItem('whatszap-completed-reminders', JSON.stringify(history.slice(0, 50)))
    }
    clearReminder(leadId)
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

    // Sort by date
    return filtered.sort((a, b) => 
      new Date(a.reminderDate!).getTime() - new Date(b.reminderDate!).getTime()
    )
  }

  const filteredLeads = getFilteredLeads()

  // Stats (Bug fix: mutually exclusive counts)
  const stats = {
    total: leadsWithReminders.length,
    today: leadsWithReminders.filter(l => {
      const d = new Date(l.reminderDate!)
      return d >= now && d < tomorrow // Today and not yet passed
    }).length,
    overdue: leadsWithReminders.filter(l => new Date(l.reminderDate!) < now).length, // Passed
    upcoming: leadsWithReminders.filter(l => new Date(l.reminderDate!) >= tomorrow).length, // Tomorrow+
  }

  const getReminderStatus = (dateStr: string) => {
    const date = new Date(dateStr)
    if (date < now) return 'overdue'
    if (date >= today && date < tomorrow) return 'today'
    return 'upcoming'
  }

  const formatReminderDate = (dateStr: string) => {
    const date = new Date(dateStr)
    // Bug fix #16: Distinguish between "today but passed" vs "today upcoming"
    const isTodayPassed = date >= today && date < now
    const isTodayUpcoming = date >= now && date < tomorrow
    const isTomorrow = date >= tomorrow && date < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
    
    if (isTodayPassed) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (passou)`
    }
    if (isTodayUpcoming) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    }
    if (isTomorrow) {
      return `Amanhã às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    }
    // Bug fix #16: Also show "(passou)" for past dates
    if (date < now) {
      return `${date.toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
      })} (passou)`
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
        <div className="grid grid-cols-4 gap-3 mb-6">
          <button 
            onClick={() => setFilter('all')}
            className={`p-3 rounded-lg border text-center transition ${
              filter === 'all' ? 'border-amber-500 bg-amber-50' : 'hover:bg-muted/50'
            }`}
          >
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </button>
          <button 
            onClick={() => setFilter('overdue')}
            className={`p-3 rounded-lg border text-center transition ${
              filter === 'overdue' ? 'border-red-500 bg-red-50' : 'hover:bg-muted/50'
            }`}
          >
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-xs text-muted-foreground">Atrasados</div>
          </button>
          <button 
            onClick={() => setFilter('today')}
            className={`p-3 rounded-lg border text-center transition ${
              filter === 'today' ? 'border-amber-500 bg-amber-50' : 'hover:bg-muted/50'
            }`}
          >
            <div className="text-2xl font-bold text-amber-600">{stats.today}</div>
            <div className="text-xs text-muted-foreground">Hoje</div>
          </button>
          <button 
            onClick={() => setFilter('upcoming')}
            className={`p-3 rounded-lg border text-center transition ${
              filter === 'upcoming' ? 'border-blue-500 bg-blue-50' : 'hover:bg-muted/50'
            }`}
          >
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            <div className="text-xs text-muted-foreground">Próximos</div>
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <Input 
            placeholder="Buscar por nome, telefone ou nota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Reminders List */}
        {filteredLeads.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h2 className="text-lg font-medium mb-1">
              {leadsWithReminders.length === 0 
                ? 'Nenhum lembrete agendado' 
                : 'Nenhum lembrete encontrado'}
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              {leadsWithReminders.length === 0 
                ? 'Crie lembretes no dashboard para não esquecer de fazer follow-up'
                : 'Tente ajustar os filtros ou a busca'}
            </p>
            <Link href="/dashboard">
              <Button>Ir para o Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map(lead => {
              const status = getReminderStatus(lead.reminderDate!)
              return (
                <Card 
                  key={lead.id}
                  className={`p-4 transition hover:shadow-md ${
                    status === 'overdue' ? 'border-red-300 bg-red-50/50' :
                    status === 'today' ? 'border-amber-300 bg-amber-50/50' :
                    ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={`p-2 rounded-full ${
                      status === 'overdue' ? 'bg-red-100' :
                      status === 'today' ? 'bg-amber-100' :
                      'bg-blue-100'
                    }`}>
                      {status === 'overdue' ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
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
                      
                      <div className={`text-sm font-medium mb-1 ${
                        status === 'overdue' ? 'text-red-600' :
                        status === 'today' ? 'text-amber-600' :
                        'text-blue-600'
                      }`}>
                        {formatReminderDate(lead.reminderDate!)}
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
                      {/* UX #78/#82/#95: Quick Snooze buttons for passed reminders with more options */}
                      {/* Bug fix #95: Use local timezone-aware date formatting instead of toISOString() */}
                      {/* Bug fix #99: Moved helper functions outside render loop for better performance */}
                      {status === 'overdue' && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {[
                            { label: '1h', ms: 60 * 60 * 1000, title: 'Adiar 1 hora' },
                            { label: '3h', ms: 3 * 60 * 60 * 1000, title: 'Adiar 3 horas' },
                            { label: 'Amanhã', ms: 'tomorrow' as const, title: 'Amanhã às 9h' },
                            { label: 'Seg', ms: 'monday' as const, title: 'Segunda às 9h' },
                          ].map((option) => (
                            <Button
                              key={option.label}
                              variant="ghost"
                              size="sm"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 h-7 text-xs active:scale-95 transition-transform"
                              onClick={() => {
                                let targetDate: Date
                                if (option.ms === 'tomorrow') {
                                  targetDate = new Date()
                                  targetDate.setDate(targetDate.getDate() + 1)
                                  targetDate.setHours(9, 0, 0, 0)
                                } else if (option.ms === 'monday') {
                                  const today = new Date()
                                  const daysUntilMonday = (8 - today.getDay()) % 7 || 7
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
                                
                                const updated = leads.map(l => 
                                  l.id === lead.id ? { ...l, reminderDate: newDate } : l
                                )
                                setLeads(updated)
                                localStorage.setItem('whatszap-leads-v3', JSON.stringify(updated))
                                // Haptic feedback
                                if ('vibrate' in navigator) navigator.vibrate(10)
                              }}
                              title={option.title}
                            >
                              +{option.label}
                            </Button>
                          ))}
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
