'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Tag, 
  Bell, 
  Check, 
  Trash2, 
  ExternalLink,
  MoreVertical,
  X,
  Clock,
  MessageCircle,
  Plus
} from 'lucide-react'

interface QuickAction {
  id: string
  icon: React.ElementType
  label: string
  color?: string
  dangerous?: boolean
}

interface QuickActionsMenuProps {
  onAction: (actionId: string) => void
  hasUnread?: boolean
  hasReminder?: boolean
  className?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'send_quick', icon: MessageCircle, label: 'Enviar mensagem', color: 'text-green-600' },
  { id: 'copy_phone', icon: Plus, label: 'Copiar telefone', color: 'text-gray-600' }, // UX #350: Quick copy phone
  { id: 'mark_read', icon: Check, label: 'Marcar como lido', color: 'text-green-600' },
  { id: 'add_tag', icon: Tag, label: 'Adicionar tag', color: 'text-blue-600' },
  { id: 'add_reminder', icon: Bell, label: 'Criar lembrete', color: 'text-amber-600' },
  { id: 'move_to', icon: ExternalLink, label: 'Mover para...', color: 'text-purple-600' }, // UX #351: Quick move to column
  { id: 'open_whatsapp', icon: ExternalLink, label: 'Abrir no WhatsApp', color: 'text-green-500' },
  { id: 'delete', icon: Trash2, label: 'Remover', color: 'text-red-500', dangerous: true },
]

/**
 * Quick Actions Menu
 * Shows a floating menu for quick lead actions
 * UX improvement: Faster access to common actions
 */
export function QuickActionsMenu({ 
  onAction, 
  hasUnread = false,
  hasReminder = false,
  className = ''
}: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false) // Bug fix #176: Prevent double-click
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Bug fix #176: Prevent double-click with debounce
  const handleAction = (actionId: string) => {
    if (isProcessing) return // Prevent double-click
    
    setIsProcessing(true)
    onAction(actionId)
    setIsOpen(false)
    
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(10)
    
    // Reset processing state after brief delay
    setTimeout(() => setIsProcessing(false), 300)
  }

  // Filter actions based on state
  const availableActions = QUICK_ACTIONS.filter(action => {
    if (action.id === 'mark_read' && !hasUnread) return false
    if (action.id === 'add_reminder' && hasReminder) return false
    return true
  })

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-1.5 rounded-full hover:bg-muted/80 transition-colors"
        aria-label="Mais ações"
      >
        <MoreVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-1 z-50 bg-background rounded-lg shadow-lg border py-1 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {availableActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors active:bg-muted active:scale-[0.98] touch-manipulation ${
                action.dangerous ? 'text-red-600 hover:bg-red-50' : ''
              }`}
              style={{ minHeight: '44px' }} // UX #129: Minimum touch target size per WCAG
            >
              <action.icon className={`w-5 h-5 ${action.color || ''}`} />
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Long Press Handler Hook
 * Detects long press on mobile for context menu
 */
export function useLongPress(
  onLongPress: () => void,
  onClick?: () => void,
  options: { threshold?: number; preventDefault?: boolean } = {}
) {
  const { threshold = 400, preventDefault = true } = options
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)
  const targetRef = useRef<EventTarget | null>(null)

  const start = (e: React.TouchEvent | React.MouseEvent) => {
    if (preventDefault && e.cancelable) {
      e.preventDefault()
    }
    targetRef.current = e.target
    isLongPressRef.current = false
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onLongPress()
      // Haptic feedback
      if ('vibrate' in navigator) navigator.vibrate([50, 30, 50])
    }, threshold)
  }

  const cancel = (e: React.TouchEvent | React.MouseEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    
    // If it wasn't a long press and we have an onClick, fire it
    if (!isLongPressRef.current && onClick && targetRef.current === e.target) {
      onClick()
    }
    
    isLongPressRef.current = false
    targetRef.current = null
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
  }
}

/**
 * Floating Action Button for Mobile
 * Shows quick actions as a FAB
 * UX #130: Enhanced with more useful actions and better visual feedback
 * UX #352: Added pending reminders badge
 */
export function MobileQuickActionsFAB({
  onNewLead,
  onSync,
  onOpenReminders,
  onOpenSearch,
  pendingReminders = 0, // UX #352: Show badge for pending reminders
  className = ''
}: {
  onNewLead?: () => void
  onSync?: () => void
  onOpenReminders?: () => void
  onOpenSearch?: () => void
  pendingReminders?: number
  className?: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [pulseReminder, setPulseReminder] = useState(false)
  
  // UX #352: Pulse animation when there are pending reminders
  useEffect(() => {
    if (pendingReminders > 0 && !isExpanded) {
      const interval = setInterval(() => {
        setPulseReminder(prev => !prev)
      }, 2000)
      return () => clearInterval(interval)
    }
    setPulseReminder(false)
  }, [pendingReminders, isExpanded])

  // Close when clicking outside
  useEffect(() => {
    if (!isExpanded) return
    const handleClick = () => setIsExpanded(false)
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick)
    }
  }, [isExpanded])

  const actions = [
    { onClick: onOpenSearch, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>, label: 'Buscar', color: 'bg-gray-600', badge: 0 },
    { onClick: onOpenReminders, icon: <Bell className="w-5 h-5" />, label: 'Lembretes', color: 'bg-amber-500', badge: pendingReminders },
    { onClick: onSync, icon: <Clock className="w-5 h-5" />, label: 'Sincronizar', color: 'bg-blue-500', badge: 0 },
    { onClick: onNewLead, icon: <MessageCircle className="w-5 h-5" />, label: 'Novo lead', color: 'bg-green-500', badge: 0 },
  ].filter(a => a.onClick)

  return (
    <div className={`fixed bottom-20 right-4 z-40 md:hidden ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 -z-10 animate-in fade-in-0 duration-200"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Expanded Actions with labels */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-200">
          {actions.map((action, idx) => (
            <div key={idx} className="flex items-center gap-3 justify-end">
              <span className="bg-gray-900/90 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                {action.label}
                {action.badge > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 rounded-full text-[10px] font-bold">
                    {action.badge > 9 ? '9+' : action.badge}
                  </span>
                )}
              </span>
              <button
                onClick={() => { action.onClick?.(); setIsExpanded(false); if ('vibrate' in navigator) navigator.vibrate(10) }}
                className={`w-12 h-12 rounded-full ${action.color} text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation relative`}
                aria-label={action.label}
              >
                {action.icon}
                {/* UX #352: Badge on button */}
                {action.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white">
                    {action.badge > 9 ? '9+' : action.badge}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => { setIsExpanded(!isExpanded); if ('vibrate' in navigator) navigator.vibrate(10) }}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-all touch-manipulation relative ${
          isExpanded ? 'rotate-45 bg-gray-700' : 'bg-green-600'
        } ${pulseReminder ? 'animate-pulse ring-4 ring-amber-400/50' : ''}`}
        aria-label={isExpanded ? 'Fechar' : 'Ações rápidas'}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Plus className="w-7 h-7 text-white" />
        )}
        {/* UX #352: Badge on main FAB when collapsed */}
        {!isExpanded && pendingReminders > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center border-2 border-white animate-bounce">
            {pendingReminders > 9 ? '9+' : pendingReminders}
          </span>
        )}
      </button>
    </div>
  )
}
