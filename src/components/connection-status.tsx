'use client'

import { Wifi, WifiOff, Loader2 } from 'lucide-react'

type ConnectionState = 'connected' | 'connecting' | 'disconnected'

interface ConnectionStatusProps {
  state: ConnectionState
  className?: string
}

export function ConnectionStatus({ state, className = '' }: ConnectionStatusProps) {
  if (state === 'connected') {
    return null // Don't show anything when connected (less noise)
  }

  const config = {
    connecting: {
      bg: 'bg-amber-500',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      text: 'Reconectando...'
    },
    disconnected: {
      bg: 'bg-red-500',
      icon: <WifiOff className="w-3 h-3" />,
      text: 'Sem conexão'
    }
  }

  const { bg, icon, text } = config[state]

  return (
    <div className={`${bg} text-white text-xs py-1 px-3 flex items-center justify-center gap-1.5 ${className}`}>
      {icon}
      <span className="font-medium">{text}</span>
    </div>
  )
}

// Mini version for header
export function ConnectionDot({ isConnected }: { isConnected: boolean }) {
  return (
    <div 
      className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} ${!isConnected ? 'animate-pulse' : ''}`}
      title={isConnected ? 'Conectado' : 'Desconectado'}
    />
  )
}
