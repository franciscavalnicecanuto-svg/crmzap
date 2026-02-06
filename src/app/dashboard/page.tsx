'use client'

import { useEffect, useState, useRef, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChatPanel } from '@/components/chat-panel'
import { useToast } from '@/components/ui/toast-notification'
import { EmptyState } from '@/components/empty-state'
import { DashboardSkeleton, LeadCardSkeleton } from '@/components/lead-card-skeleton'
import { ConnectionStatus } from '@/components/connection-status'
import { OnboardingTour } from '@/components/onboarding-tour'
import { KeyboardShortcutsModal, useKeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { logAction, ActionHistory } from '@/components/action-history'
// ReportsModal moved to /reports page
import { useSettings } from '@/components/theme-provider'
import { useDebounce } from '@/hooks/use-debounce'
import { SearchHighlight, PhoneHighlight } from '@/components/search-highlight'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MessageCircle, 
  Search,
  Wifi,
  WifiOff,
  Download,
  Loader2,
  ExternalLink,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Trash2,
  User,
  Settings,
  LogOut,
  CreditCard,
  ChevronDown,
  Bell,
  Tag,
  Calendar,
  BarChart3,
  X,
  Plus,
  Clock,
  DollarSign,
  TrendingUp,
  Filter,
  AlertCircle,
  Check,
  Keyboard,
  HelpCircle
} from 'lucide-react'
import Link from 'next/link'
import { getUser, getSession, signOut } from '@/lib/supabase-client'

interface UserInfo {
  id: string
  email: string
  name?: string
  avatarUrl?: string
}

type LeadStatus = 'novo' | 'em_contato' | 'negociando' | 'fechado' | 'perdido'
type LeadSource = 'whatsapp' | 'telegram' | 'instagram' | 'facebook' | 'unknown'

interface Lead {
  id: string
  name: string
  phone: string
  status: LeadStatus
  source: LeadSource
  whatsappId?: string
  unreadCount?: number
  lastMessage?: string
  profilePicUrl?: string | null
  // New fields for features
  tags?: string[]
  value?: number
  reminderDate?: string
  reminderNote?: string
  createdAt?: string
}

// Tag definitions with colors and categories (only 1 per category allowed)
const TAG_OPTIONS = [
  { label: 'Interesse: Alto', category: 'interesse', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { label: 'Interesse: Médio', category: 'interesse', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { label: 'Interesse: Baixo', category: 'interesse', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { label: 'Objeção: Preço', category: 'objecao', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { label: 'Objeção: Prazo', category: 'objecao', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { label: 'Urgente', category: 'status', color: 'bg-red-600/20 text-red-300 border-red-600/30' },
  { label: 'VIP', category: 'tipo', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
]

// UX #71: Relative time helper for "last message X ago"
// Bug fix #73: Handle future dates gracefully (timezone issues, clock skew)
// Bug fix #266: Handle invalid timestamps gracefully
const getRelativeTime = (dateStr: string | undefined): string | null => {
  if (!dateStr) return null
  
  try {
    const date = new Date(dateStr)
    // Bug fix #266: Check for Invalid Date (NaN)
    if (isNaN(date.getTime())) return null
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    
    // Bug fix #73: If date is in the future (clock skew, timezone), show nothing
    if (diffMs < 0) return null
    
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'agora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem` // UX #266: Show weeks for 1-4 week old leads
    return null // Don't show if older than a month
  } catch {
    return null // Silently fail for malformed dates
  }
}

const getTagColor = (tag: string) => {
  const found = TAG_OPTIONS.find(t => t.label === tag)
  return found?.color || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

const getTagCategory = (tag: string) => {
  const found = TAG_OPTIONS.find(t => t.label === tag)
  return found?.category || null
}

interface Reminder {
  leadId: string
  leadName: string
  date: string
  note?: string
}

// Ícones das plataformas
const SourceIcon = ({ source, className = "w-3.5 h-3.5" }: { source: LeadSource; className?: string }) => {
  switch (source) {
    case 'whatsapp':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      )
    case 'telegram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#0088cc">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      )
    case 'instagram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#E4405F">
          <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
        </svg>
      )
    case 'facebook':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    default:
      return <MessageCircle className={className + " text-gray-400"} />
  }
}

// Default status config (can be overridden by user settings)
const defaultStatusConfig: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  novo: { label: 'Novo', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  em_contato: { label: 'Em Contato', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  negociando: { label: 'Negociando', color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
  fechado: { label: 'Fechado', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
  perdido: { label: 'Perdido', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200' },
}

interface KanbanColumn {
  id: string
  label: string
  color: string
  bgColor: string
  visible: boolean
}

const defaultKanbanColumns: KanbanColumn[] = [
  { id: 'novo', label: 'Novo', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', visible: true },
  { id: 'em_contato', label: 'Em Contato', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', visible: true },
  { id: 'negociando', label: 'Negociando', color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200', visible: true },
  { id: 'fechado', label: 'Fechado', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', visible: true },
  { id: 'perdido', label: 'Perdido', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200', visible: true },
]

// Chat Panel Wrapper with animations and swipe-to-close
function ChatPanelWrapper({ 
  isMobile, 
  showChat, 
  selectedLead, 
  isConnected, 
  onClose,
  onOpenTags,
  onOpenReminder,
  onTagsUpdate
}: {
  isMobile: boolean
  showChat: boolean
  selectedLead: Lead | null
  isConnected: boolean
  onClose: () => void
  onOpenTags?: () => void
  onOpenReminder?: () => void
  onTagsUpdate?: (leadId: string, tags: string[]) => void
}) {
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartX = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)

  // Handle swipe gestures on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return
    touchStartX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isSwiping) return
    const currentX = e.touches[0].clientX
    const diff = currentX - touchStartX.current
    // Only allow swipe to the right (positive diff)
    if (diff > 0) {
      setSwipeX(Math.min(diff, 300))
    }
  }

  const handleTouchEnd = () => {
    if (!isMobile) return
    setIsSwiping(false)
    // If swiped more than 100px, close the panel
    if (swipeX > 100) {
      onClose()
    }
    setSwipeX(0)
  }

  return (
    <>
      {/* Mobile overlay backdrop with fade animation */}
      {isMobile && showChat && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 animate-in fade-in-0 duration-200"
          onClick={onClose}
          style={{ opacity: swipeX > 0 ? 1 - (swipeX / 300) : 1 }}
        />
      )}
      {/* Chat panel with slide animation */}
      <div 
        ref={panelRef}
        className={`
          ${isMobile 
            ? 'fixed inset-y-0 right-0 z-50 w-full sm:w-96 animate-in slide-in-from-right duration-300' 
            : 'relative w-96 flex-shrink-0'
          }
          border-l bg-background 
          flex flex-col h-full
          ${isMobile && !showChat ? 'hidden' : ''}
        `}
        style={isMobile && swipeX > 0 ? { 
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
        } : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe indicator */}
        {isMobile && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-16 bg-gray-300 rounded-full opacity-30" />
        )}
        <ChatPanel 
          lead={selectedLead ? { 
            ...selectedLead, 
            status: selectedLead.status,
            profilePicUrl: selectedLead.profilePicUrl,
            tags: selectedLead.tags,
            reminderDate: selectedLead.reminderDate
          } : null} 
          onClose={onClose}
          isConnected={isConnected}
          onTagsUpdate={onTagsUpdate}
          onOpenTags={onOpenTags}
          onOpenReminder={onOpenReminder}
        />
      </div>
    </>
  )
}

// UX #302: Enhanced Delete Zone with hover feedback and animation
function DeleteZone({ onDrop }: { onDrop: (e: React.DragEvent) => void }) {
  const [isHovering, setIsHovering] = useState(false)
  
  return (
    <div 
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in-0 duration-300"
      data-delete-zone="true"
      onDragOver={(e) => { 
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsHovering(true)
      }}
      onDragLeave={() => setIsHovering(false)}
      onDrop={(e) => {
        setIsHovering(false)
        onDrop(e)
      }}
    >
      <div className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-2xl transition-all duration-200 ${
        isHovering 
          ? 'bg-red-600 scale-110 shadow-red-500/50' 
          : 'bg-red-500 animate-pulse'
      }`}>
        <div className={`relative ${isHovering ? 'animate-bounce' : ''}`}>
          <Trash2 className="w-5 h-5 text-white" />
          {isHovering && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" />
          )}
        </div>
        <span className={`font-medium text-white transition-all ${isHovering ? 'text-lg' : ''}`}>
          {isHovering ? '🗑️ Solte para deletar!' : 'Solte aqui para remover'}
        </span>
      </div>
    </div>
  )
}

function DashboardContent() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  // UX improvement: Debounce search to avoid excessive re-renders
  const debouncedSearch = useDebounce(search, 200)
  const [isConnected, setIsConnected] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0) // UX: Visual sync progress (0-100)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null) // UX #180: Track last sync time
  const [importError, setImportError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showChat, setShowChat] = useState(false) // Start with chat hidden on mobile
  const [isMobile, setIsMobile] = useState(false)
  const [readLeads, setReadLeads] = useState<Set<string>>(new Set())
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const pullStartY = useRef(0)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [isLoadingLeads, setIsLoadingLeads] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Lead | null>(null) // Bug fix #4: Confirmação de delete
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const { settings } = useSettings()
  
  // UX #153: Keyboard shortcuts help modal
  const { showHelp: showKeyboardHelp, setShowHelp: setShowKeyboardHelp } = useKeyboardShortcuts()
  
  // Bug fix #1: Atualizar selectedLead quando leads muda
  // Bug fix #29: Only update if lead data actually changed (avoid infinite loops)
  // Bug fix #36: Normalize array comparison (empty array vs undefined)
  useEffect(() => {
    if (selectedLead) {
      const updatedLead = leads.find(l => l.id === selectedLead.id)
      if (updatedLead) {
        // Helper to normalize tags for comparison (undefined and [] are equivalent)
        // Bug fix #49: Use spread to avoid mutating original array (sort() modifies in-place)
        const normalizeTags = (tags: string[] | undefined) => [...(tags || [])].sort().join(',')
        
        // Bug fix #37: Include name in comparison (Evolution API may update contact names)
        // Only update if any field actually changed
        const hasChanges = 
          updatedLead.name !== selectedLead.name ||
          normalizeTags(updatedLead.tags) !== normalizeTags(selectedLead.tags) ||
          updatedLead.reminderDate !== selectedLead.reminderDate ||
          updatedLead.reminderNote !== selectedLead.reminderNote ||
          updatedLead.status !== selectedLead.status ||
          updatedLead.value !== selectedLead.value ||
          updatedLead.unreadCount !== selectedLead.unreadCount ||
          updatedLead.lastMessage !== selectedLead.lastMessage ||
          updatedLead.profilePicUrl !== selectedLead.profilePicUrl
        
        if (hasChanges) {
          setSelectedLead(updatedLead)
        }
      } else {
        // Bug fix #8: Lead foi deletado, limpar seleção
        setSelectedLead(null)
        setShowChat(false)
      }
    }
  }, [leads])
  
  // New states for features
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all') // UX #282: Filter by status
  const [showUnreadOnly, setShowUnreadOnly] = useState(false) // UX improvement #49: Filter unread messages
  const searchInputRef = useRef<HTMLInputElement>(null) // UX improvement #50: Keyboard shortcut ref
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminderLead, setReminderLead] = useState<Lead | null>(null)
  const [reminderDate, setReminderDate] = useState('')
  const [reminderNote, setReminderNote] = useState('')
  const [showTagModal, setShowTagModal] = useState(false)
  const [tagLead, setTagLead] = useState<Lead | null>(null)
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>(defaultKanbanColumns)

  // Bug fix #3: Fechar modais com ESC + UX #50: Ctrl+K para busca
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }
      
      // Escape to close modals or clear search
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(null)
        else if (showTagModal) setShowTagModal(false)
        else if (showReminderModal) setShowReminderModal(false)
        else if (search) setSearch('')
        else if (showChat && isMobile) {
          setSelectedLead(null)
          setShowChat(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showTagModal, showReminderModal, showDeleteConfirm, search, showChat, isMobile])

  // Bug fix #33: Sync tagLead with leads when tags are updated externally (e.g., AI analysis)
  useEffect(() => {
    if (tagLead && showTagModal) {
      const updatedLead = leads.find(l => l.id === tagLead.id)
      if (updatedLead && updatedLead.tags?.join(',') !== tagLead.tags?.join(',')) {
        setTagLead(updatedLead)
      }
    }
  }, [leads, tagLead?.id, showTagModal])

  // Fetch user on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const { user: authUser, error } = await getUser()
        if (error || !authUser) {
          // Not logged in, redirect to login
          router.push('/login')
          return
        }
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
          avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture
        })
      } catch (e) {
        console.error('Failed to load user:', e)
        router.push('/login')
      } finally {
        setIsLoadingUser(false)
      }
    }
    loadUser()
  }, [router])

  // Handle logout
  async function handleLogout() {
    try {
      await signOut()
      router.push('/login')
    } catch (e) {
      console.error('Logout error:', e)
    }
  }

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // On mobile, start with list view (chat hidden) unless a lead is selected
      if (mobile && !selectedLead) {
        setShowChat(false)
      } else if (!mobile) {
        setShowChat(true) // Desktop always shows chat panel
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [selectedLead])

  // Load leads and read state from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('whatszap-leads-v3')
    if (saved) {
      try {
        setLeads(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse leads:', e)
      }
    }
    // Load read state
    const readState = localStorage.getItem('whatszap-read-leads')
    if (readState) {
      try {
        setReadLeads(new Set(JSON.parse(readState)))
      } catch (e) {
        console.error('Failed to parse read state:', e)
      }
    }
    // Load custom kanban columns
    // Bug fix #74: Safe parsing with structure validation
    const savedColumns = localStorage.getItem('whatszap-kanban-columns')
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns)
        // Validate structure: must be array with id, label, visible
        if (Array.isArray(parsed) && parsed.length > 0 && 
            parsed.every(col => col.id && col.label && typeof col.visible === 'boolean')) {
          setKanbanColumns(parsed)
        } else {
          console.warn('Invalid kanban columns format, using defaults')
          localStorage.setItem('whatszap-kanban-columns', JSON.stringify(defaultKanbanColumns))
        }
      } catch (e) {
        console.error('Failed to parse kanban columns:', e)
        localStorage.setItem('whatszap-kanban-columns', JSON.stringify(defaultKanbanColumns))
      }
    }
    
    // UX #180: Load last sync time from localStorage
    const savedSyncTime = localStorage.getItem('whatszap-last-sync')
    if (savedSyncTime) {
      try {
        setLastSyncTime(new Date(savedSyncTime))
      } catch (e) {
        console.error('Failed to parse last sync time:', e)
      }
    }
    
    // Bug fix #28: Cleanup timeout to prevent memory leak on unmount
    const loadingTimeout = setTimeout(() => setIsLoadingLeads(false), 300)
    return () => clearTimeout(loadingTimeout)
  }, [])

  // Bug fix #5: Handle lead query parameter from reminders page
  useEffect(() => {
    const leadId = searchParams.get('lead')
    if (leadId && leads.length > 0) {
      const lead = leads.find(l => l.id === leadId)
      if (lead) {
        setSelectedLead(lead)
        setShowChat(true)
        // Clear the query parameter
        router.replace('/dashboard', { scroll: false })
      }
    }
  }, [searchParams, leads, router])

  // Update document title with unread count
  useEffect(() => {
    if (!mounted) return
    const unreadCount = leads.filter(l => (l.unreadCount || 0) > 0 && !readLeads.has(l.id)).length
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) CRMzap`
    } else {
      document.title = 'CRMzap'
    }
  }, [leads, readLeads, mounted])

  // Bug fix #6: Browser notifications for due reminders
  useEffect(() => {
    if (!mounted) return
    
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    
    // Check for due reminders every 30 seconds
    const checkReminders = () => {
      const now = new Date()
      const notifiedKey = 'whatszap-notified-reminders'
      const notified = new Set(JSON.parse(localStorage.getItem(notifiedKey) || '[]'))
      
      leads.forEach(lead => {
        if (!lead.reminderDate) return
        const reminderTime = new Date(lead.reminderDate)
        const timeDiff = reminderTime.getTime() - now.getTime()
        
        // Notify if reminder is due (within 1 minute) and not already notified
        if (timeDiff <= 60000 && timeDiff > -300000 && !notified.has(lead.id)) {
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🔔 Lembrete: ${lead.name}`, {
              body: lead.reminderNote || 'É hora de fazer follow-up!',
              icon: '/logo.png',
              tag: `reminder-${lead.id}`,
              requireInteraction: true
            })
          }
          
          // Show toast
          showToast(`🔔 Lembrete: ${lead.name}`, 'info')
          
          // Play sound
          try {
            const audio = new Audio('/notification.mp3')
            audio.volume = 0.5
            audio.play().catch(() => {})
          } catch {}
          
          // Mark as notified
          notified.add(lead.id)
          localStorage.setItem(notifiedKey, JSON.stringify([...notified]))
        }
      })
    }
    
    checkReminders()
    const interval = setInterval(checkReminders, 30000)
    return () => clearInterval(interval)
  }, [leads, mounted, showToast])

  // Save leads to localStorage when they change
  // Bug fix #46: Also save when leads array becomes empty (user deleted all leads)
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('whatszap-leads-v3', JSON.stringify(leads))
    }
  }, [leads, mounted])

  // BUG #8 FIX: Load lead statuses from Supabase on mount
  useEffect(() => {
    if (!mounted) return
    
    const loadStatusFromSupabase = async () => {
      try {
        const res = await fetch('/api/leads/status')
        const data = await res.json()
        
        if (data.success && data.statuses) {
          // Atualizar leads com status do Supabase
          setLeads(prev => prev.map(lead => {
            const phone = lead.phone.replace(/\D/g, '')
            const jid = `${phone}@s.whatsapp.net`
            const savedStatus = data.statuses[jid]
            if (savedStatus && savedStatus !== lead.status) {
              return { ...lead, status: savedStatus as LeadStatus }
            }
            return lead
          }))
        }
      } catch (err) {
        console.error('Failed to load status from Supabase:', err)
      }
    }
    
    // Bug fix #50: Delay com cleanup para evitar memory leak
    const statusTimeout = setTimeout(loadStatusFromSupabase, 500)
    return () => clearTimeout(statusTimeout)
  }, [mounted])

  // Save read state to localStorage when it changes
  useEffect(() => {
    if (mounted && readLeads.size > 0) {
      localStorage.setItem('whatszap-read-leads', JSON.stringify([...readLeads]))
    }
  }, [readLeads, mounted])

  // Check WhatsApp connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/whatsapp/status')
        const data = await res.json()
        setIsConnected(data.connected || data.state === 'open')
      } catch (err) {
        console.error('Failed to check WhatsApp status:', err)
      }
    }
    
    checkConnection()
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  // Auto-refresh leads on mount to get latest data (names, unread, photos)
  useEffect(() => {
    if (mounted && isConnected) {
      // Silently refresh data from API
      const refreshLeads = async () => {
        try {
          const res = await fetch('/api/leads')
          const data = await res.json()
          
          if (data.success && data.contacts) {
            setLeads(prev => {
              const existingMap = new Map(prev.map(l => [l.id, l]))
              
              for (const contact of data.contacts) {
                const id = `wa_${contact.phone}`
                const existing = existingMap.get(id)
                const updatedLead: Lead = {
                  id,
                  name: contact.name || contact.phone,
                  phone: contact.phone,
                  status: existing?.status || 'novo',
                  source: 'whatsapp',
                  whatsappId: contact.id,
                  unreadCount: contact.unreadCount || 0,
                  lastMessage: contact.lastMessage || '',
                  profilePicUrl: contact.profilePicUrl || null,
                  createdAt: existing?.createdAt || new Date().toISOString(),
                }
                existingMap.set(id, updatedLead)
              }
              
              return Array.from(existingMap.values())
            })
          }
        } catch (err) {
          console.error('Failed to refresh leads:', err)
        }
      }
      
      refreshLeads()
    }
  }, [mounted, isConnected])

  // Import contacts with conversations from database
  const importFromWhatsApp = async () => {
    // Bug fix #27: Guard against concurrent imports
    if (isImporting) return
    
    setIsImporting(true)
    setImportError(null)
    try {
      // Primeiro tenta buscar do banco (só contatos com mensagens)
      const res = await fetch('/api/leads')
      const data = await res.json()
      
      if (data.success && data.contacts) {
        const apiLeads: Lead[] = data.contacts.map((contact: any) => ({
          id: `wa_${contact.phone}`,
          name: contact.name || contact.phone,
          phone: contact.phone,
          status: 'novo' as LeadStatus,
          source: 'whatsapp' as LeadSource,
          whatsappId: contact.id,
          unreadCount: contact.unreadCount || 0,
          lastMessage: contact.lastMessage || '',
          profilePicUrl: contact.profilePicUrl || null,
          createdAt: new Date().toISOString(),
        }))
        
        // Bug fix #7: Atualizar leads existentes e adicionar novos (sem duplicar)
        let newCount = 0
        let updatedCount = 0
        
        setLeads(prev => {
          const existingMap = new Map(prev.map(l => [l.id, l]))
          
          // Atualizar existentes com novos dados (mantendo status e createdAt)
          for (const apiLead of apiLeads) {
            const existing = existingMap.get(apiLead.id)
            if (existing) {
              existingMap.set(apiLead.id, {
                ...apiLead,
                status: existing.status,
                tags: existing.tags, // Preservar tags
                value: existing.value, // Preservar valor
                reminderDate: existing.reminderDate, // Preservar lembrete
                reminderNote: existing.reminderNote,
                createdAt: existing.createdAt || apiLead.createdAt,
              })
              updatedCount++
            } else {
              existingMap.set(apiLead.id, apiLead)
              newCount++
            }
          }
          
          return Array.from(existingMap.values())
        })
        
        // Feedback melhorado
        if (newCount > 0 && updatedCount > 0) {
          showToast(`${newCount} novos + ${updatedCount} atualizados`, 'success')
        } else if (newCount > 0) {
          showToast(`${newCount} leads importados`, 'success')
        } else if (updatedCount > 0) {
          showToast(`${updatedCount} leads atualizados`, 'info')
        } else {
          showToast('Nenhum lead novo encontrado', 'info')
        }
        
        console.log(`Imported ${newCount} new, updated ${updatedCount} contacts`)
      } else {
        // Fallback: buscar da Evolution API
        const res2 = await fetch('/api/whatsapp/import-chats', { method: 'POST' })
        const data2 = await res2.json()
        
        if (data2.success && data2.leads) {
          const apiLeads: Lead[] = data2.leads.slice(0, 200).map((lead: any) => ({
            id: `wa_${lead.phone}`,
            name: lead.name || lead.phone,
            phone: lead.phone,
            status: 'novo' as LeadStatus,
            source: 'whatsapp' as LeadSource,
            whatsappId: lead.whatsappId,
            unreadCount: lead.unreadCount || 0,
            lastMessage: lead.lastMessage || '',
            profilePicUrl: lead.profilePicUrl || null,
            createdAt: new Date().toISOString(),
          }))
          
          setLeads(prev => {
            const existingMap = new Map(prev.map(l => [l.id, l]))
            for (const apiLead of apiLeads) {
              const existing = existingMap.get(apiLead.id)
              if (existing) {
                existingMap.set(apiLead.id, { 
                  ...apiLead, 
                  status: existing.status,
                  createdAt: existing.createdAt || apiLead.createdAt,
                })
              } else {
                existingMap.set(apiLead.id, apiLead)
              }
            }
            return Array.from(existingMap.values())
          })
        } else {
          setImportError(data2.error || 'Falha ao importar contatos')
        }
      }
    } catch (err: any) {
      setImportError(err.message || 'Erro ao importar')
    } finally {
      setIsImporting(false)
    }
  }

  // Sync messages from Evolution API to database
  // UX #89: Enhanced sync with detailed feedback and visual progress
  const syncMessages = async () => {
    setIsSyncing(true)
    setImportError(null)
    setSyncProgress(0)
    
    // Simulate progress animation while syncing
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 85) return prev // Don't go above 85% until done
        return prev + Math.random() * 15
      })
    }, 500)
    
    try {
      setSyncProgress(10)
      const res = await fetch('/api/sync', { 
        method: 'POST',
        // Bug fix #90: Add timeout to prevent hanging
        signal: AbortSignal.timeout(60000) // 60s timeout
      })
      setSyncProgress(70)
      const data = await res.json()
      
      if (data.success) {
        setSyncProgress(90)
        console.log(`Synced ${data.saved}/${data.total} messages`)
        
        // UX #89: Show detailed success feedback
        const syncMessage = data.saved > 0 
          ? `✅ ${data.saved} mensagens sincronizadas!`
          : '✅ Tudo sincronizado (sem novas mensagens)'
        showToast(syncMessage, 'success')
        
        // UX #180: Update last sync time
        const now = new Date()
        setLastSyncTime(now)
        localStorage.setItem('whatszap-last-sync', now.toISOString())
        
        // After sync, reload leads
        await importFromWhatsApp()
        setSyncProgress(100)
      } else {
        setImportError(data.error || 'Falha ao sincronizar')
        showToast('❌ Falha ao sincronizar', 'error')
      }
    } catch (err: any) {
      // Bug fix #90: Handle timeout specifically
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        setImportError('Sincronização demorou muito. Tente novamente.')
        showToast('⏱️ Timeout - tente novamente', 'error')
      } else {
        setImportError(err.message || 'Erro ao sincronizar')
        showToast('❌ Erro ao sincronizar', 'error')
      }
    } finally {
      clearInterval(progressInterval)
      // Brief delay to show 100% before hiding
      setTimeout(() => {
        setIsSyncing(false)
        setSyncProgress(0)
      }, 500)
    }
  }

  // Track recently moved leads for animation
  const [recentlyMovedLead, setRecentlyMovedLead] = useState<string | null>(null)
  
  const moveLead = (id: string, newStatus: LeadStatus) => {
    const lead = leads.find(l => l.id === id)
    const oldStatus = lead?.status
    
    // UX #101: Don't move if same status
    if (oldStatus === newStatus) return
    
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, status: newStatus } : lead
    ))
    
    // BUG #8 FIX: Persistir status no Supabase
    if (lead) {
      fetch('/api/leads/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: lead.phone, status: newStatus }),
      }).catch(err => console.error('Failed to persist status:', err))
      
      // Log action
      logAction({
        type: 'status_change',
        leadId: lead.id,
        leadName: lead.name,
        details: { from: oldStatus, to: newStatus }
      })
      
      // UX #246: Animate the moved card
      setRecentlyMovedLead(id)
      setTimeout(() => setRecentlyMovedLead(null), 500)
      
      // UX #101: Show visual feedback on move with status color
      const statusLabel = kanbanColumns.find(c => c.id === newStatus)?.label || newStatus
      const isWin = newStatus === 'fechado'
      const isLoss = newStatus === 'perdido'
      showToast(
        `${isWin ? '🎉 ' : isLoss ? '😔 ' : ''}${lead.name.split(' ')[0]} → ${statusLabel}`, 
        isWin ? 'success' : isLoss ? 'info' : 'success'
      )
      
      // Haptic feedback on mobile - stronger for wins
      if ('vibrate' in navigator) {
        navigator.vibrate(isWin ? [20, 50, 20, 50, 20] : [10, 30, 10])
      }
    }
  }

  const [draggedLead, setDraggedLead] = useState<string | null>(null)
  const [showDeleteZone, setShowDeleteZone] = useState(false)
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null) // UX #72: Visual feedback on drag over
  
  // Mobile: apenas onClick funciona (sem touch drag por enquanto)

  // Bug fix #4: Mostrar modal de confirmação ao invés de confirm() nativo
  const confirmDeleteLead = (lead: Lead) => {
    setShowDeleteConfirm(lead)
  }
  
  const deleteLead = (id: string) => {
    const lead = leads.find(l => l.id === id)
    setLeads(prev => prev.filter(lead => lead.id !== id))
    // Bug fix: Also remove from readLeads to clean up localStorage
    setReadLeads(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    if (selectedLead?.id === id) {
      setSelectedLead(null)
      setShowChat(false)
    }
    // BUG #8 FIX: Remover status do Supabase
    if (lead) {
      fetch('/api/leads/status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: lead.phone }),
      }).catch(err => console.error('Failed to delete status:', err))
    }
    showToast('Lead removido', 'info')
    setShowDeleteConfirm(null)
  }

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    e.dataTransfer.setData('leadId', lead.id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedLead(lead.id)
    setShowDeleteZone(true)
  }

  const handleDragEnd = () => {
    setDraggedLead(null)
    setShowDeleteZone(false)
    setDragOverColumn(null) // UX #72: Clear highlight on drag end
  }

  const handleDropDelete = (e: React.DragEvent) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    if (leadId) {
      const lead = leads.find(l => l.id === leadId)
      if (lead) {
        confirmDeleteLead(lead)
      }
    }
    setShowDeleteZone(false)
  }

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    moveLead(leadId, status)
    setDragOverColumn(null) // UX #72: Clear highlight on drop
  }

  // UX #72: Enhanced drag over with column tracking
  const handleDragOver = (e: React.DragEvent, status?: LeadStatus) => {
    e.preventDefault()
    if (status && dragOverColumn !== status) {
      setDragOverColumn(status)
    }
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column entirely (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null)
    }
  }

  const handleCardClick = (lead: Lead) => {
    setSelectedLead(lead)
    setShowChat(true)
    
    // Marcar como lido (adicionar ao Set de lidos)
    if (lead.unreadCount && lead.unreadCount > 0 && !readLeads.has(lead.id)) {
      setReadLeads(prev => new Set([...prev, lead.id]))
    }
  }
  
  // Helper para verificar se lead tem mensagens não lidas (considerando readLeads)
  const hasUnreadMessages = (lead: Lead) => {
    return (lead.unreadCount || 0) > 0 && !readLeads.has(lead.id)
  }
  
  // UX #53: Mark all as read
  const markAllAsRead = () => {
    const unreadLeadIds = leads.filter(l => hasUnreadMessages(l)).map(l => l.id)
    if (unreadLeadIds.length === 0) return
    
    setReadLeads(prev => new Set([...prev, ...unreadLeadIds]))
    showToast(`${unreadLeadIds.length} conversa${unreadLeadIds.length > 1 ? 's' : ''} marcada${unreadLeadIds.length > 1 ? 's' : ''} como lida${unreadLeadIds.length > 1 ? 's' : ''}`, 'success')
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current === 0 || isSyncing) return
    const currentY = e.touches[0].clientY
    const diff = currentY - pullStartY.current
    if (diff > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(diff * 0.5, 80))
      if (diff > 100) {
        setIsPulling(true)
      }
    }
  }

  const handleTouchEnd = async () => {
    if (isPulling && isConnected && !isSyncing) {
      // Haptic feedback on refresh
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10])
      }
      await syncMessages()
      showToast('Atualizado ✓', 'success')
    }
    setPullDistance(0)
    setIsPulling(false)
    pullStartY.current = 0
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  // Helper to normalize text (remove accents)
  const normalizeText = (text: string) => 
    text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  
  // UX #52: Format phone number for display (Brazilian format)
  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 13 && digits.startsWith('55')) {
      // Brazilian format: +55 (XX) 9XXXX-XXXX
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 5)}${digits.slice(5, 9)}-${digits.slice(9)}`
    } else if (digits.length === 12 && digits.startsWith('55')) {
      // Brazilian format: +55 (XX) XXXX-XXXX
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`
    } else if (digits.length >= 10) {
      // Generic format: last 4 digits separated
      return digits.slice(0, -4) + '-' + digits.slice(-4)
    }
    return phone // Return as-is if can't format
  }
  
  // Date filter helper
  // Bug fix #41: Use calendar day comparison for "today" instead of time-based diff
  // (A lead created at 11:30 PM yesterday should NOT appear as "today" at 12:30 AM)
  const isInDateRange = (lead: Lead) => {
    if (dateFilter === 'all') return true
    const createdAt = lead.createdAt ? new Date(lead.createdAt) : new Date()
    const now = new Date()
    
    if (dateFilter === 'today') {
      // Use toDateString() for accurate calendar day comparison
      return createdAt.toDateString() === now.toDateString()
    }
    
    // For 7days and 30days, time-based diff is acceptable
    const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    if (dateFilter === '7days') return diffDays <= 7
    if (dateFilter === '30days') return diffDays <= 30
    return true
  }
  
  // UX improvement: Use debounced search for filtering to avoid excessive re-renders
  const filteredLeads = useMemo(() => leads.filter(lead => {
    // Bug fix #24: Trim search to avoid false negatives with leading/trailing spaces
    const searchTrimmed = debouncedSearch.trim()
    const searchNorm = normalizeText(searchTrimmed)
    const searchDigits = searchTrimmed.replace(/\D/g, '')
    const leadPhoneDigits = lead.phone.replace(/\D/g, '')
    
    // Bug fix #13 + UX improvement: Enhanced phone search
    // - Full number match: "5511999990000" matches "+55 11 99999-0000"
    // - Partial match: "999990000" matches anywhere in phone
    // - Last 8 digits: "99990000" matches Brazilian local number format
    const matchesPhone = searchDigits.length > 0 && (
      leadPhoneDigits.includes(searchDigits) || // Full or partial match
      (searchDigits.length >= 8 && leadPhoneDigits.endsWith(searchDigits)) || // Match last N digits
      (searchDigits.length >= 4 && leadPhoneDigits.slice(-8).includes(searchDigits)) // Match within last 8 digits
    )
    
    const matchesSearch = !searchTrimmed || 
      normalizeText(lead.name).includes(searchNorm) || 
      matchesPhone ||
      (searchDigits.length === 0 && lead.phone.includes(searchTrimmed)) // Fallback for non-digit search
    const matchesDate = isInDateRange(lead)
    const matchesTag = !tagFilter || lead.tags?.includes(tagFilter)
    // UX #49: Filter by unread status
    const matchesUnread = !showUnreadOnly || hasUnreadMessages(lead)
    // UX #282: Filter by status
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    return matchesSearch && matchesDate && matchesTag && matchesUnread && matchesStatus
  }), [leads, debouncedSearch, tagFilter, dateFilter, showUnreadOnly, statusFilter])

  // UX #265: Sort leads by last activity (most recent first) + unread on top
  const getLeadsByStatus = (status: LeadStatus) => 
    filteredLeads
      .filter(lead => lead.status === status)
      .sort((a, b) => {
        // Priority 1: Unread messages on top
        const aUnread = hasUnreadMessages(a) ? 1 : 0
        const bUnread = hasUnreadMessages(b) ? 1 : 0
        if (bUnread !== aUnread) return bUnread - aUnread
        
        // Priority 2: Has reminder today
        const now = new Date()
        const aHasReminderToday = a.reminderDate && new Date(a.reminderDate).toDateString() === now.toDateString() ? 1 : 0
        const bHasReminderToday = b.reminderDate && new Date(b.reminderDate).toDateString() === now.toDateString() ? 1 : 0
        if (bHasReminderToday !== aHasReminderToday) return bHasReminderToday - aHasReminderToday
        
        // Priority 3: Most recently created (proxy for last activity)
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bTime - aTime // Descending (newest first)
      })

  // UX #157: Arrow key navigation between leads (must be after filteredLeads is defined)
  useEffect(() => {
    const handleArrowNavigation = (e: KeyboardEvent) => {
      // Skip if typing in an input
      const tagName = (e.target as HTMLElement)?.tagName
      const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA'
      
      // Skip if any modal is open
      if (isInput || showTagModal || showReminderModal || showDeleteConfirm) return
      
      // Arrow key or vim-style navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'j' || e.key === 'k') {
        e.preventDefault()
        const direction = (e.key === 'ArrowDown' || e.key === 'j') ? 1 : -1
        
        if (filteredLeads.length === 0) return
        
        if (!selectedLead) {
          // No lead selected - select first or last
          const lead = direction === 1 ? filteredLeads[0] : filteredLeads[filteredLeads.length - 1]
          setSelectedLead(lead)
          setShowChat(true)
          if ('vibrate' in navigator) navigator.vibrate(5)
        } else {
          // Find current index and move
          const currentIndex = filteredLeads.findIndex(l => l.id === selectedLead.id)
          if (currentIndex === -1) {
            setSelectedLead(filteredLeads[0])
            setShowChat(true)
          } else {
            const newIndex = Math.max(0, Math.min(filteredLeads.length - 1, currentIndex + direction))
            if (newIndex !== currentIndex) {
              setSelectedLead(filteredLeads[newIndex])
              setShowChat(true)
              // Scroll the card into view
              const card = document.querySelector(`[data-lead-id="${filteredLeads[newIndex].id}"]`)
              card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              if ('vibrate' in navigator) navigator.vibrate(5)
            }
          }
        }
        return
      }
      
      // Quick actions with keyboard when a lead is selected
      if (selectedLead) {
        // 't' to open tags
        if (e.key === 't') {
          e.preventDefault()
          setTagLead(selectedLead)
          setShowTagModal(true)
          return
        }
        // 'r' to open reminder
        if (e.key === 'r') {
          e.preventDefault()
          setReminderLead(selectedLead)
          setReminderDate('')
          setReminderNote(selectedLead.reminderNote || '')
          setShowReminderModal(true)
          return
        }
        // 'Enter' to open chat on mobile
        if (e.key === 'Enter' && isMobile && !showChat) {
          e.preventDefault()
          setShowChat(true)
          return
        }
      }
    }
    
    window.addEventListener('keydown', handleArrowNavigation)
    return () => window.removeEventListener('keydown', handleArrowNavigation)
  }, [filteredLeads, selectedLead, showTagModal, showReminderModal, showDeleteConfirm, isMobile, showChat])
    
  // Metrics calculations
  const metrics = {
    total: leads.length,
    novos: leads.filter(l => l.status === 'novo').length,
    emContato: leads.filter(l => l.status === 'em_contato').length,
    negociando: leads.filter(l => l.status === 'negociando').length,
    fechados: leads.filter(l => l.status === 'fechado').length,
    perdidos: leads.filter(l => l.status === 'perdido').length,
    valorTotal: leads.filter(l => l.status === 'fechado').reduce((acc, l) => acc + (l.value || 0), 0),
    taxaConversao: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'fechado').length / leads.length) * 100) : 0,
  }
  
  // Get pending reminders
  const pendingReminders = leads
    .filter(l => l.reminderDate && new Date(l.reminderDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000))
    .sort((a, b) => new Date(a.reminderDate!).getTime() - new Date(b.reminderDate!).getTime())
  
  // UX #179: Get "cooling" leads - leads in 'novo' or 'em_contato' without activity for 3+ days
  const coolingLeads = useMemo(() => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
    return leads.filter(l => {
      // Only check active statuses
      if (!['novo', 'em_contato'].includes(l.status)) return false
      // Already has a reminder set - user is aware
      if (l.reminderDate) return false
      // Check creation date (as proxy for last activity if we don't have lastMessageDate)
      const createdAt = l.createdAt ? new Date(l.createdAt).getTime() : Date.now()
      return createdAt < threeDaysAgo
    }).slice(0, 5) // Show max 5
  }, [leads])
  
  // UX #267: Helper to check if a specific lead is cooling
  const isLeadCooling = (lead: Lead): boolean => {
    if (!['novo', 'em_contato'].includes(lead.status)) return false
    if (lead.reminderDate) return false
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
    const createdAt = lead.createdAt ? new Date(lead.createdAt).getTime() : Date.now()
    return createdAt < threeDaysAgo
  }
  
  // Add reminder to lead
  const addReminder = (leadId: string, date: string, note: string) => {
    // Bug fix #2: Validar data no passado e tempo mínimo de 5 minutos
    // Bug fix #48: Mensagem de erro mais clara distinguindo "data passada" de "horário passou hoje"
    const reminderDateTime = new Date(date)
    const now = new Date()
    const minTime = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes from now
    
    if (reminderDateTime < now) {
      // Check if it's today but time already passed vs a past date
      const isToday = reminderDateTime.toDateString() === now.toDateString()
      if (isToday) {
        showToast('Esse horário já passou. Escolha um horário futuro.', 'error')
      } else {
        showToast('Data não pode ser no passado', 'error')
      }
      return
    }
    
    if (reminderDateTime < minTime) {
      showToast('Lembrete deve ser pelo menos 5 minutos no futuro', 'error')
      return
    }
    
    const lead = leads.find(l => l.id === leadId)
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, reminderDate: date, reminderNote: note } : l
    ))
    setShowReminderModal(false)
    setReminderLead(null)
    setReminderDate('')
    setReminderNote('')
    showToast('Lembrete criado ✓', 'success')
    
    // Log action
    if (lead) {
      logAction({
        type: 'reminder_set',
        leadId: lead.id,
        leadName: lead.name,
        details: { date, note }
      })
    }
  }
  
  // Clear reminder
  // Bug fix #283: Also remove from notified reminders to allow re-scheduling
  const clearReminder = (leadId: string) => {
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, reminderDate: undefined, reminderNote: undefined } : l
    ))
    
    // Bug fix #283: Remove from notified set so user can reschedule same lead
    try {
      const notifiedKey = 'whatszap-notified-reminders'
      const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]')
      const filtered = notified.filter((id: string) => id !== leadId)
      localStorage.setItem(notifiedKey, JSON.stringify(filtered))
    } catch (e) {
      console.error('Failed to clear notified reminder:', e)
    }
    
    showToast('Lembrete removido', 'info')
  }
  
  // Toggle tag on lead (only 1 per category)
  const toggleTag = (leadId: string, tag: string) => {
    const category = getTagCategory(tag)
    let wasAdded = false
    
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l
      const currentTags = l.tags || []
      const hasTag = currentTags.includes(tag)
      
      let newTags: string[]
      if (hasTag) {
        // Remove tag
        newTags = currentTags.filter(t => t !== tag)
      } else {
        // Add tag, but first remove other tags from same category
        const tagsWithoutSameCategory = category 
          ? currentTags.filter(t => getTagCategory(t) !== category)
          : currentTags
        newTags = [...tagsWithoutSameCategory, tag]
        wasAdded = true
      }
      
      // Also update tagLead state for immediate modal feedback
      if (tagLead && tagLead.id === leadId) {
        setTagLead({ ...tagLead, tags: newTags })
      }
      
      return { ...l, tags: newTags }
    }))
    
    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(wasAdded ? 10 : 5)
    }
  }
  
  // Update lead value
  const updateLeadValue = (leadId: string, value: number) => {
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, value } : l
    ))
  }

  return (
    <div 
      className="h-screen bg-background flex overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-green-50 transition-all"
          style={{ height: pullDistance }}
        >
          <div className={`flex items-center gap-2 text-green-600 text-sm ${isPulling ? 'scale-110' : ''} transition-transform`}>
            <RefreshCw className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
            <span>{isPulling ? 'Solte para atualizar' : 'Puxe para atualizar'}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
          <div className="px-3 h-12 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition">
                <div className="relative">
                  <img src="/logo.png" alt="CRMzap" className="w-6 h-6 rounded-md" />
                  {/* UX #53: Unread counter badge with mark all as read on click */}
                  {(() => {
                    const unreadCount = leads.filter(l => (l.unreadCount || 0) > 0 && !readLeads.has(l.id)).length
                    return unreadCount > 0 ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          markAllAsRead()
                        }}
                        className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 cursor-pointer transition-colors"
                        title="Clique para marcar todas como lidas"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </button>
                    ) : null
                  })()}
                </div>
                <span className="font-bold text-sm hidden sm:inline">CRMzap</span>
              </Link>
            </div>
            
            {/* Bug fix #12: Campo de busca melhorado com botão de limpar + UX #50: Keyboard shortcut */}
            {/* UX #170: Search results count indicator */}
            <div className="flex-1 max-w-xs">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input 
                  ref={searchInputRef}
                  placeholder="Buscar... (Ctrl+K)" 
                  className="pl-7 pr-7 h-7 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar leads (Ctrl+K)"
                />
                {search && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {/* UX #170: Show result count while searching */}
                    {debouncedSearch.trim() && (
                      <span className={`text-[9px] font-medium px-1 rounded ${
                        filteredLeads.length === 0 
                          ? 'text-red-500' 
                          : 'text-green-600'
                      }`}>
                        {filteredLeads.length}
                      </span>
                    )}
                    <button
                      onClick={() => setSearch('')}
                      className="w-4 h-4 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center"
                      aria-label="Limpar busca"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {/* UX #281: Attention needed badge - shows cooling leads + overdue reminders */}
              {(() => {
                const overdueCount = leads.filter(l => l.reminderDate && new Date(l.reminderDate) < new Date()).length
                const coolingCount = coolingLeads.length
                const totalAttention = overdueCount + coolingCount
                
                if (totalAttention === 0) return null
                
                return (
                  <Link href="/reminders">
                    <Button 
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2 text-xs gap-1 ${
                        overdueCount > 0 
                          ? 'text-red-600 hover:bg-red-50 hover:text-red-700' 
                          : 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                      }`}
                      title={`${overdueCount} lembrete${overdueCount !== 1 ? 's' : ''} atrasado${overdueCount !== 1 ? 's' : ''}, ${coolingCount} lead${coolingCount !== 1 ? 's' : ''} esfriando`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Atenção</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        overdueCount > 0 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {totalAttention}
                      </span>
                    </Button>
                  </Link>
                )
              })()}
              {/* UX #268: Quick sync button */}
              {isConnected && !isSyncing && (
                <Button 
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-green-50 hover:text-green-600"
                  onClick={syncMessages}
                  title="Sincronizar mensagens"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              )}
              {isSyncing && (
                <Button 
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 cursor-not-allowed"
                  disabled
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-green-500" />
                </Button>
              )}
              
              <Link href="/connect">
                <Button 
                  variant={isConnected ? 'outline' : 'default'}
                  size="sm"
                  className={`h-7 text-xs px-2 ${isConnected ? 'border-green-500 text-green-600' : 'bg-green-500 text-white'}`}
                >
                  {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                </Button>
              </Link>

              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowChat(!showChat)}
              >
                {showChat ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user?.avatarUrl} />
                      <AvatarFallback className="text-[10px] bg-green-100 text-green-700">
                        {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium hidden sm:inline max-w-[80px] truncate">
                      {user?.name || 'Usuário'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.name || 'Usuário'}</span>
                      <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Meu Perfil
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/subscription">
                    <DropdownMenuItem>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Assinatura
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/reminders">
                    <DropdownMenuItem>
                      <Bell className="mr-2 h-4 w-4" />
                      Lembretes
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/settings">
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  {/* UX #158: Help options */}
                  <DropdownMenuItem onClick={() => setShowKeyboardHelp(true)}>
                    <Keyboard className="mr-2 h-4 w-4" />
                    Atalhos de teclado
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.dispatchEvent(new Event('crmzap-open-tour'))}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Ver tour novamente
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Import Error */}
        {importError && (
          <div className="bg-red-50 border-b border-red-200 px-3 py-1 text-xs text-red-800">
            {importError}
          </div>
        )}

        {/* UX #189: Enhanced Sync Progress Bar with shimmer */}
        {isSyncing && (
          <div className={`border-b px-3 py-2 animate-in slide-in-from-top-1 duration-200 transition-colors ${
            syncProgress >= 100 
              ? 'bg-green-100 border-green-300 sync-complete' 
              : 'bg-green-50 border-green-200 sync-shimmer'
          }`}>
            <div className="flex items-center gap-2 text-xs text-green-700 mb-1">
              {syncProgress >= 100 ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              <span className="font-medium">
                {syncProgress < 20 ? '📡 Conectando ao servidor...' : 
                 syncProgress < 50 ? '📥 Buscando mensagens...' :
                 syncProgress < 80 ? '💾 Salvando mensagens...' :
                 syncProgress < 95 ? '🔄 Processando...' : 
                 syncProgress >= 100 ? '✅ Sincronização completa!' : '⏳ Finalizando...'}
              </span>
              <span className={`ml-auto font-bold count-animated transition-colors ${
                syncProgress >= 100 ? 'text-green-600' : ''
              }`}>
                {Math.round(syncProgress)}%
              </span>
            </div>
            <div className="w-full h-2 bg-green-200/60 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className={`h-full rounded-full transition-all ease-out relative ${
                  syncProgress >= 100 
                    ? 'bg-green-500 duration-500' 
                    : 'bg-gradient-to-r from-green-500 via-green-400 to-green-500 duration-300'
                }`}
                style={{ width: `${Math.min(syncProgress, 100)}%` }}
              >
                {syncProgress < 100 && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending Reminders Alert */}
        {pendingReminders.length > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <Bell className="w-4 h-4 text-amber-500" />
              <span className="text-amber-200 font-medium">
                {pendingReminders.length} lembrete{pendingReminders.length > 1 ? 's' : ''} pendente{pendingReminders.length > 1 ? 's' : ''}:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto">
                {pendingReminders.slice(0, 3).map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => {
                      setSelectedLead(lead)
                      setShowChat(true)
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition whitespace-nowrap"
                  >
                    <Clock className="w-3 h-3" />
                    {lead.name}
                    <X 
                      className="w-3 h-3 hover:text-amber-100" 
                      onClick={(e) => {
                        e.stopPropagation()
                        clearReminder(lead.id)
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* UX #179: Cooling Leads Alert - leads without contact for 3+ days */}
        {coolingLeads.length > 0 && !pendingReminders.length && (
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-3 py-2 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              <span className="text-blue-200 font-medium">
                {coolingLeads.length} lead{coolingLeads.length > 1 ? 's' : ''} esfriando (sem contato há 3+ dias):
              </span>
              <div className="flex items-center gap-2 overflow-x-auto">
                {coolingLeads.slice(0, 3).map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => {
                      setSelectedLead(lead)
                      setShowChat(true)
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition whitespace-nowrap touch-manipulation"
                  >
                    {lead.name.split(' ')[0]}
                  </button>
                ))}
                {coolingLeads.length > 3 && (
                  <span className="text-blue-400 opacity-70">+{coolingLeads.length - 3}</span>
                )}
              </div>
              <Link href="/reminders" className="ml-auto text-blue-300 hover:text-blue-200 underline underline-offset-2">
                Ver todos →
              </Link>
            </div>
          </div>
        )}

        {/* Metrics & Filters Bar - Unified */}
        <div className="border-b border-border/50 bg-muted/10 px-3 py-2">
          <div className="flex items-center justify-between">
            {/* Metrics - All in one row */}
            <div className="flex items-center gap-4 text-xs overflow-x-auto">
              <div className="flex items-center gap-1">
                <span className="font-bold text-base">{metrics.total}</span>
                <span className="text-muted-foreground">Total</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-base text-blue-600">{metrics.novos}</span>
                <span className="text-muted-foreground">Novos</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-base text-purple-600">{metrics.negociando}</span>
                <span className="text-muted-foreground">Negociando</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-base text-green-600">{metrics.fechados}</span>
                <span className="text-muted-foreground">Fechados</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-base text-blue-500">{metrics.taxaConversao}%</span>
                <span className="text-muted-foreground">Conversão</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-base text-emerald-500">R$ {metrics.valorTotal.toLocaleString('pt-BR')}</span>
                <span className="text-muted-foreground">Faturado</span>
              </div>
            </div>
            
            {/* Bug fix #6: Filters com contadores */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* UX #49: Unread Filter - Quick toggle for unread messages */}
              {(() => {
                const unreadCount = leads.filter(l => hasUnreadMessages(l)).length
                return unreadCount > 0 ? (
                  <Button 
                    variant={showUnreadOnly ? 'default' : 'outline'}
                    size="sm" 
                    className={`h-6 text-xs px-2 gap-1 ${showUnreadOnly ? 'bg-green-500 hover:bg-green-600 text-white' : 'border-green-300 text-green-600 hover:bg-green-50'}`}
                    onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span className="hidden sm:inline">Não lidas</span>
                    <Badge variant={showUnreadOnly ? 'outline' : 'secondary'} className={`ml-1 h-4 px-1 text-[10px] ${showUnreadOnly ? 'border-white/50 text-white' : ''}`}>
                      {unreadCount}
                    </Badge>
                  </Button>
                ) : null
              })()}
              
              {/* Date Filter */}
              {/* Bug fix #42 & #43: Use consistent date filtering logic (calendar day for 'today') */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1">
                    <Calendar className="w-3 h-3" />
                    {dateFilter === 'all' ? 'Todos' : dateFilter === 'today' ? 'Hoje' : dateFilter === '7days' ? '7 dias' : '30 dias'}
                    {dateFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                        {leads.filter(l => {
                          const created = l.createdAt ? new Date(l.createdAt) : new Date()
                          const now = new Date()
                          // Bug fix #42: Use toDateString for 'today' to match isInDateRange logic
                          if (dateFilter === 'today') return created.toDateString() === now.toDateString()
                          const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
                          if (dateFilter === '7days') return diffDays <= 7
                          if (dateFilter === '30days') return diffDays <= 30
                          return true
                        }).length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDateFilter('all')}>
                    Todos <span className="ml-auto text-muted-foreground">{leads.length}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter('today')}>
                    Hoje <span className="ml-auto text-muted-foreground">{leads.filter(l => {
                      const created = l.createdAt ? new Date(l.createdAt) : new Date()
                      return created.toDateString() === new Date().toDateString()
                    }).length}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter('7days')}>
                    Últimos 7 dias <span className="ml-auto text-muted-foreground">{leads.filter(l => {
                      const created = l.createdAt ? new Date(l.createdAt) : new Date()
                      // Bug fix #43: Include today in 7 days count (0 <= diffDays <= 7)
                      const diffDays = Math.floor((new Date().getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
                      return diffDays >= 0 && diffDays <= 7
                    }).length}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDateFilter('30days')}>
                    Últimos 30 dias <span className="ml-auto text-muted-foreground">{leads.filter(l => {
                      const created = l.createdAt ? new Date(l.createdAt) : new Date()
                      const diffDays = Math.floor((new Date().getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
                      return diffDays >= 0 && diffDays <= 30
                    }).length}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Tag Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1">
                    <Tag className="w-3 h-3" />
                    {tagFilter ? tagFilter.split(': ')[1] || tagFilter : 'Tags'}
                    {tagFilter && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                        {leads.filter(l => l.tags?.includes(tagFilter)).length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTagFilter(null)}>
                    Todas <span className="ml-auto text-muted-foreground">{leads.length}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {TAG_OPTIONS.map(tag => {
                    const count = leads.filter(l => l.tags?.includes(tag.label)).length
                    return (
                      <DropdownMenuItem key={tag.label} onClick={() => setTagFilter(tag.label)}>
                        {tag.label} <span className="ml-auto text-muted-foreground">{count}</span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* UX #282: Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1">
                    <Filter className="w-3 h-3" />
                    {statusFilter === 'all' ? 'Status' : kanbanColumns.find(c => c.id === statusFilter)?.label || statusFilter}
                    {statusFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                        {leads.filter(l => l.status === statusFilter).length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    Todos os Status <span className="ml-auto text-muted-foreground">{leads.length}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {kanbanColumns.filter(col => col.visible).map(col => {
                    const count = leads.filter(l => l.status === col.id).length
                    return (
                      <DropdownMenuItem 
                        key={col.id} 
                        onClick={() => setStatusFilter(col.id as LeadStatus)}
                        className={count === 0 ? 'opacity-50' : ''}
                      >
                        <span className={col.color}>{col.label}</span>
                        <span className="ml-auto text-muted-foreground">{count}</span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* UX #209: Last sync indicator */}
              {lastSyncTime && !isSyncing && (
                <div 
                  className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/70 hover:text-muted-foreground cursor-pointer transition-colors"
                  onClick={syncMessages}
                  title="Clique para sincronizar novamente"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>
                    {(() => {
                      const diffMs = Date.now() - lastSyncTime.getTime()
                      const diffMins = Math.floor(diffMs / 60000)
                      if (diffMins < 1) return 'agora'
                      if (diffMins < 60) return `${diffMins}m`
                      const diffHours = Math.floor(diffMins / 60)
                      if (diffHours < 24) return `${diffHours}h`
                      return lastSyncTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    })()}
                  </span>
                </div>
              )}
              
              {/* Reports Button */}
              <Link href="/reports">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs px-2 gap-1 border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <BarChart3 className="w-3 h-3" />
                  Relatórios
                </Button>
              </Link>
              
              {/* History - Compact */}
              <div className="hidden md:block">
                <ActionHistory compact limit={5} />
              </div>
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoadingLeads && (
          <div className="flex-1 overflow-hidden">
            <DashboardSkeleton />
          </div>
        )}

        {/* Empty State - No leads at all */}
        {!isLoadingLeads && leads.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState 
              type={isConnected ? 'no-leads' : 'not-connected'}
              onAction={isConnected ? importFromWhatsApp : () => router.push('/connect')}
              actionLabel={isConnected ? 'Importar Contatos' : 'Conectar WhatsApp'}
            />
          </div>
        )}
        
        {/* UX #51: Empty state for filtered/searched results */}
        {!isLoadingLeads && leads.length > 0 && filteredLeads.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-medium text-lg mb-2">Nenhum lead encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search ? `Não encontramos resultados para "${search.trim()}"` : 
                 showUnreadOnly ? 'Não há mensagens não lidas no momento' :
                 tagFilter ? `Nenhum lead com a tag "${tagFilter}"` :
                 statusFilter !== 'all' ? `Nenhum lead no status "${kanbanColumns.find(c => c.id === statusFilter)?.label || statusFilter}"` :
                 dateFilter !== 'all' ? `Nenhum lead criado neste período` :
                 'Tente ajustar seus filtros'}
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                {search && (
                  <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                    <X className="w-3 h-3 mr-1" />
                    Limpar busca
                  </Button>
                )}
                {showUnreadOnly && (
                  <Button variant="outline" size="sm" onClick={() => setShowUnreadOnly(false)}>
                    <MessageCircle className="w-3 h-3 mr-1" />
                    Ver todas
                  </Button>
                )}
                {(tagFilter || dateFilter !== 'all' || statusFilter !== 'all') && (
                  <Button variant="outline" size="sm" onClick={() => { setTagFilter(null); setDateFilter('all'); setStatusFilter('all') }}>
                    <Filter className="w-3 h-3 mr-1" />
                    Limpar filtros
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Kanban Board - Only show when we have filtered results */}
        {/* UX #105: Improved mobile scrolling with snap points and better touch handling */}
        {!isLoadingLeads && leads.length > 0 && filteredLeads.length > 0 && (
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-2 pb-4 snap-x snap-mandatory md:snap-none scroll-smooth">
            <div className="flex gap-2 h-full touch-pan-x" style={{ minWidth: 'max-content', paddingRight: '8px' }}>
              {kanbanColumns.filter(col => col.visible).map((column) => {
                const status = column.id as LeadStatus
                const statusLeads = getLeadsByStatus(status)
                
                return (
                  <div 
                    key={status}
                    className={`flex-shrink-0 w-44 md:w-40 flex flex-col transition-all duration-150 snap-start ${
                      dragOverColumn === status ? 'scale-[1.02] opacity-100 drop-zone-active' : draggedLead ? 'opacity-70' : ''
                    }`}
                    data-status={status}
                    role="region"
                    aria-label={`Coluna ${column.label} com ${statusLeads.length} leads`}
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, status)}
                  >
                    {/* UX #72: Enhanced column header with drag highlight */}
                    <div className={`rounded-md border p-1.5 mb-1 transition-all ${
                      dragOverColumn === status 
                        ? 'ring-2 ring-green-400 shadow-lg border-green-300 bg-green-50' 
                        : column.bgColor
                    }`}>
                      <div className="flex items-center gap-1">
                        <span className={`font-semibold text-xs ${column.color}`}>{column.label}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {statusLeads.length}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                      <div className="space-y-1">
                        {statusLeads.map((lead) => {
                          const hasUnread = hasUnreadMessages(lead)
                          const isCooling = isLeadCooling(lead) // UX #267: Check if lead needs attention
                          return (
                            <Card 
                              key={lead.id}
                              data-lead-id={lead.id}
                              className={`${settings.compactView ? 'p-1.5' : 'p-2'} cursor-pointer hover:shadow-md transition-all active:scale-[0.97] active:bg-gray-100 group relative min-h-[44px] touch-manipulation lead-card-hover ${
                                selectedLead?.id === lead.id 
                                  ? 'ring-2 ring-green-500 shadow-md' 
                                  : hasUnread 
                                    ? 'bg-green-50 border-green-300 shadow-sm' 
                                    : isCooling
                                      ? 'border-amber-300 bg-amber-50/30 lead-cooling' // UX #267: Visual indicator for cooling leads
                                      : ''
                              } ${draggedLead === lead.id ? 'dragging-card' : ''} ${recentlyMovedLead === lead.id ? 'lead-just-moved' : ''}`}
                              draggable
                              role="button"
                              tabIndex={0}
                              aria-label={`${lead.name}${hasUnread ? ', mensagem não lida' : ''}${lead.reminderDate ? ', tem lembrete' : ''}`}
                              aria-selected={selectedLead?.id === lead.id}
                              onDragStart={(e) => handleDragStart(e, lead)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleCardClick(lead)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  handleCardClick(lead)
                                }
                              }}
                            >
                              <div className={`flex items-center ${settings.compactView ? 'gap-1' : 'gap-1.5'}`}>
                                <div className="relative shrink-0">
                                  <Avatar className={`${settings.compactView ? 'h-5 w-5' : 'h-6 w-6'} ${hasUnread ? 'ring-2 ring-green-400' : ''}`}>
                                    {lead.profilePicUrl && (
                                      <AvatarImage src={lead.profilePicUrl} alt={lead.name} />
                                    )}
                                    <AvatarFallback className={`font-medium ${settings.compactView ? 'text-[8px]' : 'text-[9px]'} ${
                                      hasUnread 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
                                    <SourceIcon source={lead.source || 'whatsapp'} className={settings.compactView ? 'w-2 h-2' : 'w-2.5 h-2.5'} />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <h3 className={`${settings.compactView ? 'text-[10px]' : 'text-[11px]'} truncate leading-tight ${
                                      hasUnread ? 'font-bold' : 'font-medium'
                                    }`}>
                                      {/* UX improvement: Highlight search term in lead name */}
                                      {debouncedSearch.trim() ? (
                                        <SearchHighlight 
                                          text={lead.name} 
                                          searchTerm={debouncedSearch}
                                          highlightClassName="bg-yellow-200 text-yellow-900 rounded-sm px-0.5"
                                        />
                                      ) : lead.name}
                                    </h3>
                                    {hasUnread && (
                                      <span className={`flex-shrink-0 ${settings.compactView ? 'w-3.5 h-3.5 text-[7px]' : 'w-4 h-4 text-[8px]'} bg-green-500 text-white rounded-full flex items-center justify-center font-bold`}>
                                        {lead.unreadCount! > 9 ? '9+' : lead.unreadCount}
                                      </span>
                                    )}
                                    {/* UX: "Novo" badge for leads created in last 24h */}
                                    {!settings.compactView && lead.createdAt && (() => {
                                      const created = new Date(lead.createdAt)
                                      const hoursSinceCreated = (Date.now() - created.getTime()) / 3600000
                                      if (hoursSinceCreated <= 24) {
                                        return (
                                          <span className="text-[7px] px-1 py-0.5 bg-blue-500 text-white rounded-full font-medium" title={`Criado ${hoursSinceCreated < 1 ? 'agora' : `há ${Math.floor(hoursSinceCreated)}h`}`}>
                                            NOVO
                                          </span>
                                        )
                                      }
                                      return null
                                    })()}
                                    {/* UX #267: Cooling lead indicator */}
                                    {isCooling && !hasUnread && (
                                      <span 
                                        className="text-[7px] px-1 py-0.5 bg-amber-400 text-amber-900 rounded-full font-medium flex items-center gap-0.5"
                                        title="Sem contato há mais de 3 dias - considere fazer follow-up"
                                      >
                                        <Clock className="w-2 h-2" />
                                        {!settings.compactView && '3d+'}
                                      </span>
                                    )}
                                    {/* UX #85: Enhanced reminder indicator with urgency levels */}
                                    {lead.reminderDate && (() => {
                                      const reminderTime = new Date(lead.reminderDate).getTime()
                                      const now = Date.now()
                                      const timeDiff = reminderTime - now
                                      const isOverdue = timeDiff < 0
                                      const isUrgent = !isOverdue && timeDiff < 2 * 60 * 60 * 1000 // menos de 2h
                                      const isSoon = !isOverdue && !isUrgent && timeDiff < 24 * 60 * 60 * 1000 // menos de 24h
                                      
                                      // Helper para mostrar tempo restante
                                      const getTimeLeft = () => {
                                        if (isOverdue) {
                                          const mins = Math.abs(Math.floor(timeDiff / 60000))
                                          if (mins < 60) return `${mins}min atrás`
                                          const hours = Math.floor(mins / 60)
                                          if (hours < 24) return `${hours}h atrás`
                                          return `${Math.floor(hours / 24)}d atrás`
                                        }
                                        const mins = Math.floor(timeDiff / 60000)
                                        if (mins < 60) return `em ${mins}min`
                                        const hours = Math.floor(mins / 60)
                                        if (hours < 24) return `em ${hours}h`
                                        return `em ${Math.floor(hours / 24)}d`
                                      }
                                      
                                      return (
                                        <div className="relative group/reminder">
                                          <Bell className={`${settings.compactView ? 'w-2.5 h-2.5' : 'w-3 h-3'} cursor-help transition-all ${
                                            isOverdue ? 'text-red-500 animate-pulse' :
                                            isUrgent ? 'text-orange-500 animate-bounce' :
                                            isSoon ? 'text-amber-500' :
                                            'text-amber-400'
                                          }`} />
                                          <div className="absolute bottom-full left-0 mb-1 hidden group-hover/reminder:block z-50">
                                            <div className={`rounded-lg p-2 shadow-lg min-w-[160px] text-[10px] border ${
                                              isOverdue ? 'bg-red-50 border-red-200' :
                                              isUrgent ? 'bg-orange-50 border-orange-200' :
                                              'bg-amber-50 border-amber-200'
                                            }`}>
                                              <div className={`font-semibold mb-1 ${
                                                isOverdue ? 'text-red-700' : isUrgent ? 'text-orange-700' : 'text-amber-700'
                                              }`}>
                                                {isOverdue ? '⚠️ Lembrete atrasado!' : isUrgent ? '🔔 Lembrete em breve!' : '🔔 Lembrete'}
                                              </div>
                                              <div className={isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-amber-600'}>
                                                {new Date(lead.reminderDate).toLocaleString('pt-BR', { 
                                                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                                                })}
                                                <span className="ml-1 font-medium">({getTimeLeft()})</span>
                                              </div>
                                              {lead.reminderNote && (
                                                <div className={`mt-1 italic ${isOverdue ? 'text-red-800' : 'text-amber-800'}`}>
                                                  "{lead.reminderNote}"
                                                </div>
                                              )}
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); clearReminder(lead.id) }}
                                                className="mt-1.5 text-red-500 hover:text-red-700 text-[9px]"
                                              >
                                                ✕ Remover
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                  {!settings.compactView && (
                                    <div className="flex items-center gap-1">
                                      <p className={`text-[9px] truncate flex-1 ${
                                        hasUnread ? 'text-green-700' : 'text-muted-foreground'
                                      }`}>{lead.lastMessage || lead.phone}</p>
                                      {/* UX #71: Relative time indicator */}
                                      {lead.createdAt && getRelativeTime(lead.createdAt) && (
                                        <span className="text-[8px] text-muted-foreground/60 whitespace-nowrap">
                                          {getRelativeTime(lead.createdAt)}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Tags - hidden in compact view */}
                              {!settings.compactView && lead.tags && lead.tags.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mt-1">
                                  {lead.tags.slice(0, 2).map(tag => (
                                    <span key={tag} className={`text-[8px] px-1 py-0.5 rounded border ${getTagColor(tag)}`}>
                                      {tag.split(': ')[1] || tag}
                                    </span>
                                  ))}
                                  {lead.tags.length > 2 && (
                                    <span className="text-[8px] text-muted-foreground">+{lead.tags.length - 2}</span>
                                  )}
                                </div>
                              )}
                              {/* Quick Actions (on hover) - UX #100 + UX #137: Added WhatsApp Web shortcut */}
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition flex gap-0.5">
                                {/* UX #100: Quick mark as read - only show if has unread */}
                                {hasUnread && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setReadLeads(prev => new Set([...prev, lead.id]))
                                      // Haptic feedback
                                      if ('vibrate' in navigator) navigator.vibrate(5)
                                    }}
                                    className="p-1 rounded bg-green-100 hover:bg-green-200 transition"
                                    title="Marcar como lido"
                                  >
                                    <Check className="w-3 h-3 text-green-600" />
                                  </button>
                                )}
                                {/* UX #137: Quick open in WhatsApp Web/App */}
                                <a
                                  href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded bg-background/80 hover:bg-green-100 transition"
                                  title="Abrir no WhatsApp"
                                >
                                  <ExternalLink className="w-3 h-3 text-green-600" />
                                </a>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setTagLead(lead)
                                    setShowTagModal(true)
                                  }}
                                  className="p-1 rounded bg-background/80 hover:bg-muted transition"
                                  title="Gerenciar tags"
                                >
                                  <Tag className="w-3 h-3" />
                                </button>
                                {!lead.reminderDate && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setReminderLead(lead)
                                      // Bug fix #34: Clear date for new reminders (no pre-populate needed here)
                                      setReminderDate('')
                                      setReminderNote('')
                                      setShowReminderModal(true)
                                    }}
                                    className="p-1 rounded bg-background/80 hover:bg-muted transition"
                                    title="Criar lembrete"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </Card>
                          )
                        })}
                        
                        {statusLeads.length === 0 && (
                          <div className={`text-center py-6 text-muted-foreground text-[9px] border-2 border-dashed rounded-lg transition-all ${
                            draggedLead 
                              ? 'border-green-400 bg-green-50/50 empty-column-animate' 
                              : 'border-muted'
                          }`}>
                            <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center transition-all ${
                              draggedLead ? 'bg-green-100' : 'bg-muted/30'
                            }`}>
                              {draggedLead ? (
                                <Plus className="w-4 h-4 text-green-600" />
                              ) : (
                                <MessageCircle className="w-4 h-4 text-muted-foreground/50" />
                              )}
                            </div>
                            <p className="font-medium">
                              {draggedLead ? 'Solte aqui' : 'Nenhum lead'}
                            </p>
                            {!draggedLead && (
                              <p className="text-[8px] mt-0.5 opacity-70">
                                Arraste leads para cá
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {/* Lembretes Hoje - Column (Bug fix #19: separate passed vs pending) */}
              <div className="flex-shrink-0 w-44 flex flex-col snap-start">
                {(() => {
                  const now = new Date()
                  const todayRemindersCount = leads.filter(l => {
                    if (!l.reminderDate) return false
                    const reminderDate = new Date(l.reminderDate)
                    return reminderDate.toDateString() === now.toDateString()
                  }).length
                  const overdueCount = leads.filter(l => {
                    if (!l.reminderDate) return false
                    return new Date(l.reminderDate) < now && new Date(l.reminderDate).toDateString() === now.toDateString()
                  }).length
                  const hasOverdue = overdueCount > 0
                  
                  return (
                    <div className={`rounded-md border p-1.5 mb-1 transition-all ${
                      hasOverdue 
                        ? 'bg-red-50 border-red-300 reminder-column-active' 
                        : todayRemindersCount > 0 
                          ? 'bg-amber-50 border-amber-200' 
                          : 'bg-amber-50/50 border-amber-200/50'
                    }`}>
                      <div className="flex items-center gap-1">
                        <Bell className={`w-3 h-3 ${hasOverdue ? 'text-red-500 animate-pulse' : 'text-amber-600'}`} />
                        <span className={`font-semibold text-xs ${hasOverdue ? 'text-red-700' : 'text-amber-700'}`}>
                          {hasOverdue ? 'Atrasados!' : 'Lembretes Hoje'}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={`text-[10px] h-4 px-1 ${
                            hasOverdue 
                              ? 'bg-red-100 text-red-700 animate-pulse' 
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {todayRemindersCount}
                        </Badge>
                      </div>
                    </div>
                  )
                })()}
                
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-1">
                    {(() => {
                      const now = new Date()
                      const todayReminders = leads.filter(l => {
                        if (!l.reminderDate) return false
                        const reminderDate = new Date(l.reminderDate)
                        return reminderDate.toDateString() === now.toDateString()
                      }).sort((a, b) => new Date(a.reminderDate!).getTime() - new Date(b.reminderDate!).getTime())
                      
                      const passedReminders = todayReminders.filter(l => new Date(l.reminderDate!) < now)
                      const pendingReminders = todayReminders.filter(l => new Date(l.reminderDate!) >= now)
                      
                      return (
                        <>
                          {/* Pending reminders first */}
                          {pendingReminders.map(lead => (
                            <Card 
                              key={`reminder-${lead.id}`}
                              className="p-2 cursor-pointer hover:shadow-md transition-all bg-amber-50/50 border-amber-200"
                              onClick={() => handleCardClick(lead)}
                            >
                              <div className="flex items-start gap-1.5">
                                <Bell className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-[10px] font-medium truncate">{lead.name}</h4>
                                  <div className="text-[9px] text-amber-600 font-medium">
                                    {new Date(lead.reminderDate!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  {lead.reminderNote && (
                                    <p className="text-[8px] text-muted-foreground truncate mt-0.5">
                                      {lead.reminderNote}
                                    </p>
                                  )}
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); clearReminder(lead.id) }}
                                  className="text-amber-400 hover:text-red-500 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </Card>
                          ))}
                          
                          {/* Passed reminders with visual distinction + UX #54: Clear all overdue */}
                          {passedReminders.length > 0 && (
                            <div className="pt-1 mt-1 border-t border-amber-200/50">
                              <div className="flex items-center justify-between px-1 mb-1">
                                <p className="text-[8px] text-muted-foreground">Passados</p>
                                {passedReminders.length > 1 && (
                                  <button 
                                    onClick={() => {
                                      passedReminders.forEach(l => clearReminder(l.id))
                                      showToast(`${passedReminders.length} lembretes removidos`, 'info')
                                    }}
                                    className="text-[8px] text-red-500 hover:text-red-700 transition"
                                  >
                                    Limpar todos
                                  </button>
                                )}
                              </div>
                              {passedReminders.map(lead => (
                                <Card 
                                  key={`reminder-passed-${lead.id}`}
                                  className="p-2 cursor-pointer hover:shadow-md transition-all bg-gray-50 border-gray-200 opacity-60"
                                  onClick={() => handleCardClick(lead)}
                                >
                                  <div className="flex items-start gap-1.5">
                                    <AlertCircle className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-[10px] font-medium truncate text-gray-600">{lead.name}</h4>
                                      <div className="text-[9px] text-gray-500 line-through">
                                        {new Date(lead.reminderDate!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); clearReminder(lead.id) }}
                                      className="text-gray-400 hover:text-red-500 transition"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                          
                          {todayReminders.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground text-[9px]">
                              <Bell className="w-6 h-6 mx-auto mb-1 text-amber-300" />
                              <p>Nenhum lembrete para hoje</p>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Zone - UX #302: Enhanced delete zone with better feedback */}
        {showDeleteZone && (
          <DeleteZone onDrop={handleDropDelete} />
        )}
        
        {/* Mobile: drag desabilitado por enquanto, apenas tap para abrir chat */}
      </div>

      {/* Chat Panel - controlled by showChat state */}
      {showChat && (
        <ChatPanelWrapper
          isMobile={isMobile}
          showChat={showChat}
          selectedLead={selectedLead}
          isConnected={isConnected}
          onClose={() => {
            setSelectedLead(null)
            setShowChat(false)
          }}
          onOpenTags={() => {
            if (selectedLead) {
              setTagLead(selectedLead)
              setShowTagModal(true)
            }
          }}
          onOpenReminder={() => {
            if (selectedLead) {
              setReminderLead(selectedLead)
              // Bug fix #34: Format ISO date to datetime-local format (YYYY-MM-DDTHH:MM)
              // Bug fix #39: Use local time, not UTC (toISOString converts to UTC which is wrong)
              const existingDate = selectedLead.reminderDate
              if (existingDate) {
                try {
                  const date = new Date(existingDate)
                  // Format as YYYY-MM-DDTHH:MM in LOCAL timezone for datetime-local input
                  const year = date.getFullYear()
                  const month = String(date.getMonth() + 1).padStart(2, '0')
                  const day = String(date.getDate()).padStart(2, '0')
                  const hours = String(date.getHours()).padStart(2, '0')
                  const minutes = String(date.getMinutes()).padStart(2, '0')
                  const formatted = `${year}-${month}-${day}T${hours}:${minutes}`
                  setReminderDate(formatted)
                } catch {
                  setReminderDate('')
                }
              } else {
                setReminderDate('')
              }
              setReminderNote(selectedLead.reminderNote || '')
              setShowReminderModal(true)
            }
          }}
          onTagsUpdate={(leadId, newTags) => {
            // Update lead tags from AI analysis (respecting category uniqueness)
            setLeads(prev => prev.map(l => {
              if (l.id !== leadId) return l
              // Merge new tags with existing, but replace same-category tags
              const existingTags = l.tags || []
              let mergedTags = [...existingTags]
              
              for (const newTag of newTags) {
                const category = getTagCategory(newTag)
                if (category) {
                  // Remove existing tags from same category
                  mergedTags = mergedTags.filter(t => getTagCategory(t) !== category)
                }
                if (!mergedTags.includes(newTag)) {
                  mergedTags.push(newTag)
                }
              }
              
              return { ...l, tags: mergedTags }
            }))
          }}
        />
      )}

      {/* Tag Modal */}
      {showTagModal && tagLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in-0 duration-150" onClick={() => setShowTagModal(false)}>
          <div className="bg-background rounded-lg p-4 w-80 shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Tags para {tagLead.name}</h3>
              <button onClick={() => setShowTagModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Interesse - só 1 */}
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1.5">Nível de Interesse (selecione 1)</p>
              <div className="flex gap-1.5">
                {TAG_OPTIONS.filter(t => t.category === 'interesse').map(tag => {
                  const isSelected = tagLead.tags?.includes(tag.label)
                  return (
                    <button
                      key={tag.label}
                      onClick={() => toggleTag(tagLead.id, tag.label)}
                      className={`flex-1 px-2 py-1.5 rounded text-xs border transition flex items-center justify-center gap-1 ${
                        isSelected ? tag.color + ' font-medium ring-2 ring-offset-1' : 'bg-muted/30 border-muted hover:bg-muted/50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {tag.label.split(': ')[1]}
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Objeção - só 1 */}
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1.5">Objeção Principal (selecione 1)</p>
              <div className="flex gap-1.5">
                {TAG_OPTIONS.filter(t => t.category === 'objecao').map(tag => {
                  const isSelected = tagLead.tags?.includes(tag.label)
                  return (
                    <button
                      key={tag.label}
                      onClick={() => toggleTag(tagLead.id, tag.label)}
                      className={`flex-1 px-2 py-1.5 rounded text-xs border transition flex items-center justify-center gap-1 ${
                        isSelected ? tag.color + ' font-medium ring-2 ring-offset-1' : 'bg-muted/30 border-muted hover:bg-muted/50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {tag.label.split(': ')[1]}
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Outros */}
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1.5">Marcadores</p>
              <div className="flex gap-1.5">
                {TAG_OPTIONS.filter(t => t.category !== 'interesse' && t.category !== 'objecao').map(tag => {
                  const isSelected = tagLead.tags?.includes(tag.label)
                  return (
                    <button
                      key={tag.label}
                      onClick={() => toggleTag(tagLead.id, tag.label)}
                      className={`px-3 py-1.5 rounded text-xs border transition flex items-center gap-1 ${
                        isSelected ? tag.color + ' font-medium ring-2 ring-offset-1' : 'bg-muted/30 border-muted hover:bg-muted/50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {tag.label}
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Tags atuais */}
            {tagLead.tags && tagLead.tags.length > 0 && (
              <div className="mb-3 pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1.5">Tags atuais (clique para remover)</p>
                <div className="flex flex-wrap gap-1">
                  {tagLead.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tagLead.id, tag)}
                      className={`px-2 py-1 rounded text-xs border ${getTagColor(tag)} flex items-center gap-1`}
                    >
                      {tag.split(': ')[1] || tag}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <Button 
              className="w-full mt-3" 
              variant="outline" 
              size="sm"
              onClick={() => setShowTagModal(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && reminderLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in-0 duration-150" onClick={() => setShowReminderModal(false)}>
          <div className="bg-background rounded-lg p-4 w-80 shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Lembrete para {reminderLead.name}</h3>
              <button onClick={() => setShowReminderModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* UX #75 + UX #182: Enhanced Quick Snooze Buttons with smart suggestions */}
            <div className="mb-3">
              <label className="text-xs text-muted-foreground mb-1.5 block">⚡ Atalhos rápidos</label>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[
                  { label: '30min', ms: 30 * 60 * 1000, icon: '⏰' },
                  { label: '1h', ms: 60 * 60 * 1000, icon: '🕐' },
                  { label: '3h', ms: 3 * 60 * 60 * 1000, icon: '🕒' },
                  { label: 'Amanhã 9h', ms: 'tomorrow' as const, icon: '☀️' },
                ].map((option) => {
                  // Check if this option is currently selected
                  const getTargetDate = () => {
                    if (option.ms === 'tomorrow') {
                      const d = new Date()
                      d.setDate(d.getDate() + 1)
                      d.setHours(9, 0, 0, 0)
                      return d
                    }
                    return new Date(Date.now() + option.ms)
                  }
                  const targetDate = getTargetDate()
                  const formatted = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}T${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`
                  const isSelected = reminderDate === formatted
                  
                  return (
                    <button
                      key={option.label}
                      onClick={() => {
                        setReminderDate(formatted)
                        if ('vibrate' in navigator) navigator.vibrate(10)
                      }}
                      className={`px-2 py-2 text-xs rounded border transition-all active:scale-95 flex flex-col items-center gap-0.5 ${
                        isSelected 
                          ? 'border-amber-500 bg-amber-100 text-amber-800 ring-2 ring-amber-300 font-medium' 
                          : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300'
                      }`}
                    >
                      <span className="text-sm">{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
              {/* UX #182: Segunda linha com opções de dia específico */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Seg 9h', getDate: () => { const d = new Date(); const daysUntil = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + daysUntil); d.setHours(9, 0, 0, 0); return d } },
                  { label: 'Sex 14h', getDate: () => { const d = new Date(); const daysUntil = (12 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + daysUntil); d.setHours(14, 0, 0, 0); return d } },
                  { label: 'Próx semana', getDate: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); return d } },
                ].map((option) => {
                  const targetDate = option.getDate()
                  const formatted = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}T${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`
                  const isSelected = reminderDate === formatted
                  
                  return (
                    <button
                      key={option.label}
                      onClick={() => {
                        setReminderDate(formatted)
                        if ('vibrate' in navigator) navigator.vibrate(10)
                      }}
                      className={`px-2 py-1.5 text-[10px] rounded border transition-all active:scale-95 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-100 text-blue-800 ring-1 ring-blue-300 font-medium' 
                          : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ou escolha data e hora</label>
                <Input
                  type="datetime-local"
                  value={reminderDate}
                  onChange={e => setReminderDate(e.target.value)}
                  min={(() => {
                    // Bug fix #40 & #76: Use local time and recalculate on each render
                    const minDate = new Date(Date.now() + 5 * 60 * 1000)
                    const year = minDate.getFullYear()
                    const month = String(minDate.getMonth() + 1).padStart(2, '0')
                    const day = String(minDate.getDate()).padStart(2, '0')
                    const hours = String(minDate.getHours()).padStart(2, '0')
                    const minutes = String(minDate.getMinutes()).padStart(2, '0')
                    return `${year}-${month}-${day}T${hours}:${minutes}`
                  })()}
                  className={`text-sm ${reminderDate && new Date(reminderDate) < new Date() ? 'border-red-300 bg-red-50 focus:ring-red-400' : ''}`}
                />
                {/* UX #284: Inline validation warning for past dates */}
                {reminderDate && new Date(reminderDate) < new Date() && (
                  <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Data/hora no passado - escolha um horário futuro
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nota (opcional)</label>
                <Input
                  placeholder="Ex: Ligar sobre orçamento"
                  value={reminderNote}
                  onChange={e => setReminderNote(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1"
                onClick={() => setShowReminderModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                className="flex-1 bg-green-500 hover:bg-green-600"
                onClick={() => {
                  if (reminderDate) {
                    addReminder(reminderLead.id, reminderDate, reminderNote)
                  }
                }}
                disabled={!reminderDate}
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bug fix #4: Modal de confirmação de delete */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in-0 duration-150" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-background rounded-lg p-4 w-80 shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Remover Lead</h3>
                <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm mb-4">
              Tem certeza que deseja remover <strong>{showDeleteConfirm.name}</strong>?
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => deleteLead(showDeleteConfirm.id)}
              >
                Remover
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Tour */}
      <OnboardingTour />
      
      {/* UX #153: Keyboard shortcuts help modal */}
      <KeyboardShortcutsModal 
        isOpen={showKeyboardHelp} 
        onClose={() => setShowKeyboardHelp(false)} 
      />
    </div>
  )
}

// Wrapper with Suspense for useSearchParams
export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
