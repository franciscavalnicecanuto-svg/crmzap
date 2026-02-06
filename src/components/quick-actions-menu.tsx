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
  MessageCircle
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
  { id: 'mark_read', icon: Check, label: 'Marcar como lido', color: 'text-green-600' },
  { id: 'add_tag', icon: Tag, label: 'Adicionar tag', color: 'text-blue-600' },
  { id: 'add_reminder', icon: Bell, label: 'Criar lembrete', color: 'text-amber-600' },
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

  const handleAction = (actionId: string) => {
    onAction(actionId)
    setIsOpen(false)
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(10)
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
          className="absolute right-0 top-full mt-1 z-50 bg-background rounded-lg shadow-lg border py-1 min-w-[160px] animate-in fade-in-0 zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {availableActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                action.dangerous ? 'text-red-600 hover:bg-red-50' : ''
              }`}
            >
              <action.icon className={`w-4 h-4 ${action.color || ''}`} />
              <span>{action.label}</span>
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
 */
export function MobileQuickActionsFAB({
  onNewLead,
  onSync,
  className = ''
}: {
  onNewLead?: () => void
  onSync?: () => void
  className?: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={`fixed bottom-20 right-4 z-40 md:hidden ${className}`}>
      {/* Expanded Actions */}
      {isExpanded && (
        <div className="absolute bottom-14 right-0 flex flex-col gap-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-200">
          {onSync && (
            <button
              onClick={() => { onSync(); setIsExpanded(false) }}
              className="w-12 h-12 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Sincronizar"
            >
              <Clock className="w-5 h-5" />
            </button>
          )}
          {onNewLead && (
            <button
              onClick={() => { onNewLead(); setIsExpanded(false) }}
              className="w-12 h-12 rounded-full bg-green-500 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Novo lead"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full bg-green-600 text-white shadow-xl flex items-center justify-center active:scale-95 transition-all ${
          isExpanded ? 'rotate-45 bg-gray-600' : ''
        }`}
        aria-label={isExpanded ? 'Fechar' : 'Ações rápidas'}
      >
        {isExpanded ? (
          <X className="w-6 h-6" />
        ) : (
          <MoreVertical className="w-6 h-6" />
        )}
      </button>
    </div>
  )
}
