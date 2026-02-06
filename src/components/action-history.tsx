'use client'

import { useState, useEffect } from 'react'
import { 
  History, 
  ArrowRight, 
  Bell, 
  Tag, 
  MessageCircle, 
  Trash2, 
  Plus,
  DollarSign,
  X
} from 'lucide-react'

export interface ActionRecord {
  id: string
  type: 'status_change' | 'reminder_set' | 'reminder_done' | 'tag_added' | 'tag_removed' | 'message_sent' | 'lead_created' | 'lead_deleted' | 'value_set'
  leadId: string
  leadName: string
  details: Record<string, any>
  timestamp: number
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  status_change: ArrowRight,
  reminder_set: Bell,
  reminder_done: Bell,
  tag_added: Tag,
  tag_removed: Tag,
  message_sent: MessageCircle,
  lead_created: Plus,
  lead_deleted: Trash2,
  value_set: DollarSign
}

const ACTION_COLORS: Record<string, string> = {
  status_change: 'bg-blue-100 text-blue-600',
  reminder_set: 'bg-amber-100 text-amber-600',
  reminder_done: 'bg-green-100 text-green-600',
  tag_added: 'bg-purple-100 text-purple-600',
  tag_removed: 'bg-gray-100 text-gray-600',
  message_sent: 'bg-green-100 text-green-600',
  lead_created: 'bg-emerald-100 text-emerald-600',
  lead_deleted: 'bg-red-100 text-red-600',
  value_set: 'bg-green-100 text-green-600'
}

// Helper to log actions
export function logAction(action: Omit<ActionRecord, 'id' | 'timestamp'>) {
  const record: ActionRecord = {
    ...action,
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now()
  }
  
  const existing = JSON.parse(localStorage.getItem('crmzap-action-history') || '[]')
  // Keep last 100 actions
  const updated = [record, ...existing].slice(0, 100)
  localStorage.setItem('crmzap-action-history', JSON.stringify(updated))
  
  // Dispatch event for real-time updates
  window.dispatchEvent(new CustomEvent('crmzap-action-logged', { detail: record }))
}

function formatTimestamp(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return 'agora'
  if (diff < 3600000) return `há ${Math.floor(diff / 60000)} min`
  if (diff < 86400000) return `há ${Math.floor(diff / 3600000)}h`
  if (diff < 172800000) return 'ontem'
  
  return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function getActionDescription(action: ActionRecord): string {
  switch (action.type) {
    case 'status_change':
      return `moveu para ${action.details.to}`
    case 'reminder_set':
      return `lembrete criado`
    case 'reminder_done':
      return `lembrete concluído`
    case 'tag_added':
      return `tag "${action.details.tag}" adicionada`
    case 'tag_removed':
      return `tag "${action.details.tag}" removida`
    case 'message_sent':
      return `mensagem enviada`
    case 'lead_created':
      return `lead criado`
    case 'lead_deleted':
      return `lead removido`
    case 'value_set':
      return `valor: R$ ${action.details.value?.toLocaleString('pt-BR')}`
    default:
      return 'ação realizada'
  }
}

interface ActionHistoryProps {
  leadId?: string // Filter by specific lead
  limit?: number
  compact?: boolean
}

export function ActionHistory({ leadId, limit = 10, compact = false }: ActionHistoryProps) {
  const [actions, setActions] = useState<ActionRecord[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const loadActions = () => {
      const all = JSON.parse(localStorage.getItem('crmzap-action-history') || '[]') as ActionRecord[]
      const filtered = leadId ? all.filter(a => a.leadId === leadId) : all
      setActions(filtered.slice(0, limit))
    }
    
    loadActions()
    
    // Listen for new actions
    const handler = () => loadActions()
    window.addEventListener('crmzap-action-logged', handler)
    return () => window.removeEventListener('crmzap-action-logged', handler)
  }, [leadId, limit])

  if (actions.length === 0) {
    return null
  }

  if (compact) {
    return (
      <div className="text-xs text-muted-foreground">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <History className="w-3 h-3" />
          {actions.length} ações recentes
        </button>
        
        {isOpen && (
          <div className="mt-2 space-y-1 pl-4 border-l-2 border-muted">
            {actions.slice(0, 5).map(action => (
              <div key={action.id} className="text-[11px]">
                <span className="font-medium">{action.leadName}</span>
                {' · '}
                {getActionDescription(action)}
                {' · '}
                <span className="text-muted-foreground">{formatTimestamp(action.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="w-4 h-4" />
        Histórico de Ações
      </div>
      
      <div className="space-y-1">
        {actions.map(action => {
          const Icon = ACTION_ICONS[action.type] || History
          const colorClass = ACTION_COLORS[action.type] || 'bg-gray-100 text-gray-600'
          
          return (
            <div 
              key={action.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${colorClass}`}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{action.leadName}</span>
                  {' · '}
                  <span className="text-muted-foreground">{getActionDescription(action)}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTimestamp(action.timestamp)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Modal version for full history
export function ActionHistoryModal({ onClose }: { onClose: () => void }) {
  const [actions, setActions] = useState<ActionRecord[]>([])

  useEffect(() => {
    const all = JSON.parse(localStorage.getItem('crmzap-action-history') || '[]') as ActionRecord[]
    setActions(all)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        className="bg-background rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Histórico de Ações</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[60vh] p-4">
          {actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma ação registrada ainda
            </div>
          ) : (
            <ActionHistory limit={100} />
          )}
        </div>
      </div>
    </div>
  )
}
