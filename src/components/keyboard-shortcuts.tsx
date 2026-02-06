'use client'

import { useState, useEffect } from 'react'
import { X, Keyboard, Command, ArrowUp, CornerDownLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShortcutGroup {
  title: string
  shortcuts: {
    keys: string[]
    description: string
  }[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navegação',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Buscar leads' },
      { keys: ['↑', '↓'], description: 'Navegar entre leads' },
      { keys: ['j', 'k'], description: 'Navegar entre leads (vim)' },
      { keys: ['Esc'], description: 'Fechar painel/modal' },
      { keys: ['?'], description: 'Mostrar atalhos' },
    ]
  },
  {
    title: 'Lead Selecionado',
    shortcuts: [
      { keys: ['t'], description: 'Abrir tags' },
      { keys: ['r'], description: 'Criar/editar lembrete' },
      { keys: ['v'], description: 'Toggle VIP' },
      { keys: ['u'], description: 'Toggle Urgente' },
      { keys: ['c'], description: 'Copiar telefone' },
      { keys: ['w'], description: 'Abrir no WhatsApp' },
      { keys: ['Ctrl', 'Shift', 'U'], description: 'Marcar como não lida' },
      { keys: ['Enter'], description: 'Abrir conversa' },
    ]
  },
  {
    title: 'Chat',
    shortcuts: [
      { keys: ['Enter'], description: 'Enviar mensagem' },
      { keys: ['Shift', 'Enter'], description: 'Nova linha' },
      { keys: ['Alt', '1-7'], description: 'Respostas rápidas' },
      { keys: ['Ctrl', 'R'], description: 'Atualizar mensagens' },
      { keys: ['Ctrl', 'Shift', 'A'], description: 'Analisar com IA' },
    ]
  },
  {
    title: 'Templates',
    shortcuts: [
      { keys: ['Ctrl', 'T'], description: 'Abrir templates' },
      { keys: ['Esc'], description: 'Fechar templates' },
    ]
  }
]

/**
 * Keyboard Shortcuts Modal
 * UX #153: Help modal showing all available keyboard shortcuts
 */
export function KeyboardShortcutsModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean
  onClose: () => void 
}) {
  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-background rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Keyboard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Atalhos de Teclado</h2>
              <p className="text-xs text-muted-foreground">Navegue mais rápido com atalhos</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="hover:bg-green-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx}>
                          <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono shadow-sm border">
                            {key === 'Ctrl' && <Command className="w-3 h-3 inline" />}
                            {key === 'Shift' && <ArrowUp className="w-3 h-3 inline" />}
                            {key === 'Enter' && <CornerDownLeft className="w-3 h-3 inline" />}
                            {!['Ctrl', 'Shift', 'Enter'].includes(key) && key}
                          </kbd>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground mx-0.5">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs text-center text-muted-foreground">
            Pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs border">?</kbd> a qualquer momento para ver esta ajuda
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to register global keyboard shortcut listener
 */
export function useKeyboardShortcuts(enabled: boolean = true) {
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Show help on ? key (Shift + /)
      if (e.key === '?' && !e.ctrlKey && !e.altKey) {
        // Don't trigger if typing in an input
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        
        e.preventDefault()
        setShowHelp(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled])

  return {
    showHelp,
    setShowHelp,
  }
}

/**
 * Keyboard Shortcuts Button
 * Shows a button that opens the shortcuts modal
 */
export function KeyboardShortcutsButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground hover:text-foreground gap-1.5"
        title="Atalhos de teclado (?)"
      >
        <Keyboard className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Atalhos</span>
      </Button>
      <KeyboardShortcutsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
