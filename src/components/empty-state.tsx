'use client'

import { MessageCircle, Users, Inbox, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  type: 'no-leads' | 'no-messages' | 'no-results' | 'not-connected'
  onAction?: () => void
  actionLabel?: string
}

export function EmptyState({ type, onAction, actionLabel }: EmptyStateProps) {
  const configs = {
    'no-leads': {
      icon: Users,
      title: 'Nenhum lead ainda',
      description: 'Conecte seu WhatsApp e importe seus contatos para começar.',
      gradient: 'from-green-500/20 to-emerald-500/20'
    },
    'no-messages': {
      icon: MessageCircle,
      title: 'Sem mensagens',
      description: 'Selecione um lead para ver a conversa.',
      gradient: 'from-blue-500/20 to-cyan-500/20'
    },
    'no-results': {
      icon: Search,
      title: 'Nenhum resultado',
      description: 'Tente buscar com outros termos.',
      gradient: 'from-purple-500/20 to-pink-500/20'
    },
    'not-connected': {
      icon: Inbox,
      title: 'WhatsApp desconectado',
      description: 'Conecte seu WhatsApp para ver suas conversas.',
      gradient: 'from-amber-500/20 to-orange-500/20'
    }
  }

  const config = configs[type]
  const Icon = config.icon

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {/* Illustrated Icon */}
      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-4`}>
        <div className="w-14 h-14 rounded-full bg-background/80 flex items-center justify-center shadow-inner">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
      </div>
      
      <h3 className="font-semibold text-base mb-1">{config.title}</h3>
      <p className="text-muted-foreground text-sm max-w-[200px] mb-4">
        {config.description}
      </p>
      
      {onAction && actionLabel && (
        <Button onClick={onAction} size="sm" className="bg-green-500 hover:bg-green-600">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
