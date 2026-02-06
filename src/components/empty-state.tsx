'use client'

import { MessageCircle, Users, Inbox, Search, Wifi, Download, ArrowRight, Sparkles, Zap, RefreshCw, Clock, Bell, Tag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  type: 'no-leads' | 'no-messages' | 'no-results' | 'not-connected' | 'error' | 'no-reminders' | 'loading'
  onAction?: () => void
  actionLabel?: string
  secondaryAction?: () => void
  secondaryLabel?: string
  errorMessage?: string
}

export function EmptyState({ type, onAction, actionLabel, secondaryAction, secondaryLabel, errorMessage }: EmptyStateProps) {
  const configs = {
    'no-leads': {
      icon: Users,
      title: 'Pronto para começar!',
      description: 'Importe seus contatos do WhatsApp para ver todas as conversas aqui.',
      gradient: 'from-green-500/20 to-emerald-500/20',
      tips: [
        '📲 Seus contatos serão importados automaticamente',
        '💬 Histórico de mensagens preservado',
        '🏷️ Organize com tags e status'
      ]
    },
    'no-messages': {
      icon: MessageCircle,
      title: 'Selecione uma conversa',
      description: 'Clique em um lead à esquerda para ver as mensagens.',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      tips: [
        '💡 Use <kbd>Ctrl</kbd>+<kbd>K</kbd> para buscar leads',
        '⬆️⬇️ <kbd>↑</kbd><kbd>↓</kbd> ou <kbd>J</kbd><kbd>K</kbd> para navegar',
        '🏷️ <kbd>T</kbd> para tags, <kbd>R</kbd> para lembrete',
        '✨ IA sugere respostas automaticamente'
      ]
    },
    'no-results': {
      icon: Search,
      title: 'Nenhum resultado',
      description: 'Não encontramos leads com esse termo.',
      gradient: 'from-purple-500/20 to-pink-500/20',
      tips: [
        '🔍 Tente buscar por nome ou telefone',
        '🏷️ Filtre por tags ou status',
        '📅 Use filtros de data'
      ]
    },
    'not-connected': {
      icon: Wifi,
      title: 'Conecte seu WhatsApp',
      description: 'Escaneie o QR Code para sincronizar suas conversas.',
      gradient: 'from-amber-500/20 to-orange-500/20',
      tips: [
        '📱 Abra o WhatsApp no celular',
        '⚙️ Vá em Configurações > Aparelhos conectados',
        '📷 Escaneie o QR Code na próxima tela'
      ]
    },
    // UX #104: Error state for API failures
    'error': {
      icon: RefreshCw,
      title: 'Algo deu errado',
      description: errorMessage || 'Não foi possível carregar os dados. Tente novamente.',
      gradient: 'from-red-500/20 to-orange-500/20',
      tips: [
        '🔄 Verifique sua conexão com a internet',
        '📱 Confirme que o WhatsApp está conectado',
        '⏱️ Aguarde alguns segundos e tente novamente'
      ]
    },
    // UX #804: Loading state for better perceived performance
    'loading': {
      icon: Loader2,
      title: 'Carregando...',
      description: 'Buscando suas conversas e contatos.',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      tips: [
        '⏳ Isso pode levar alguns segundos',
        '📱 Verificando conexão com WhatsApp',
        '💾 Carregando histórico de mensagens'
      ]
    },
    // UX #131: Empty state for reminders page
    'no-reminders': {
      icon: Inbox,
      title: 'Nenhum lembrete ativo',
      description: 'Crie lembretes para não esquecer de fazer follow-up com seus leads.',
      gradient: 'from-amber-500/20 to-yellow-500/20',
      tips: [
        '🔔 Clique no ícone de sino em qualquer lead',
        '⏰ Escolha data e hora para ser lembrado',
        '📝 Adicione uma nota para lembrar o contexto'
      ]
    }
  }

  const config = configs[type]
  const Icon = config.icon

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
      {/* Illustrated Icon - UX #94: Removed aggressive pulse animation */}
      {/* UX #173: Enhanced empty state with subtle glow effect */}
      <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-5 empty-state-glow`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        <div className="w-16 h-16 rounded-full bg-background/90 flex items-center justify-center shadow-lg backdrop-blur-sm">
          <Icon className={`w-8 h-8 text-muted-foreground ${type === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
        </div>
        {/* Decorative dots - UX #173: Reduced motion for accessibility */}
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 motion-safe:animate-ping" />
        <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full bg-blue-400" />
      </div>
      
      <h3 className="font-semibold text-lg mb-1.5">{config.title}</h3>
      <p className="text-muted-foreground text-sm max-w-[280px] mb-5">
        {config.description}
      </p>
      
      {/* Tips section - UX #177: Enhanced with keyboard shortcut styling */}
      {config.tips && (
        <div className="mb-5 text-left bg-muted/30 rounded-lg p-3 max-w-[280px]">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <Sparkles className="w-3 h-3" />
            Dicas
          </div>
          <ul className="space-y-1.5">
            {config.tips.map((tip, idx) => (
              <li 
                key={idx} 
                className="text-xs text-muted-foreground/80 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: tip.replace(
                    /<kbd>([^<]+)<\/kbd>/g, 
                    '<kbd class="px-1 py-0.5 bg-muted rounded text-[10px] font-mono border border-border/50 shadow-sm">$1</kbd>'
                  )
                }}
              />
            ))}
          </ul>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        {onAction && actionLabel && (
          <Button 
            onClick={onAction} 
            size="sm" 
            className="bg-green-500 hover:bg-green-600 gap-1.5 px-4"
          >
            {type === 'no-leads' && <Download className="w-3.5 h-3.5" />}
            {type === 'not-connected' && <Wifi className="w-3.5 h-3.5" />}
            {actionLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
        {secondaryAction && secondaryLabel && (
          <Button 
            onClick={secondaryAction} 
            size="sm" 
            variant="outline"
            className="gap-1.5"
          >
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
