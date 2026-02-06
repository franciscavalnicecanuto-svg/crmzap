'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  MessageSquarePlus, 
  X, 
  Plus, 
  Trash2, 
  Copy,
  Zap,
  Check,
  Pencil,
  RotateCcw,
  AlertTriangle,
  CopyPlus
} from 'lucide-react'

interface Template {
  id: string
  name: string
  content: string
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Saudação',
    content: 'Olá! Tudo bem? Vi que você se interessou pelo nosso produto. Como posso te ajudar?'
  },
  {
    id: '2',
    name: 'Preço',
    content: 'O valor é R$ [VALOR]. Posso te explicar melhor o que está incluso?'
  },
  {
    id: '3',
    name: 'Follow-up',
    content: 'Oi! Passando pra saber se ficou alguma dúvida sobre nossa conversa. Posso ajudar com algo?'
  },
  {
    id: '4',
    name: 'Urgência',
    content: 'Só te avisando que essa condição especial é válida só até hoje! Quer garantir?'
  },
  {
    id: '5',
    name: 'Fechamento',
    content: 'Perfeito! Vou te mandar os dados pra pagamento. Prefere Pix ou cartão?'
  }
]

interface TemplatePickerProps {
  onSelect: (content: string) => void
  onClose: () => void
}

export function TemplatePicker({ onSelect, onClose }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [search, setSearch] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null) // UX #55: Edit existing templates
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null) // Bug fix #56: Confirm before delete
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null) // UX #504: Preview before send
  const [showDiscardWarning, setShowDiscardWarning] = useState(false) // Bug fix #650: Warn before discarding edits
  const [templateUsage, setTemplateUsage] = useState<Record<string, number>>({}) // UX #654: Track template usage
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('crmzap-message-templates')
    if (saved) {
      try {
        setTemplates(JSON.parse(saved))
      } catch {
        // Bug fix #57: Handle corrupted localStorage
        setTemplates(DEFAULT_TEMPLATES)
        localStorage.setItem('crmzap-message-templates', JSON.stringify(DEFAULT_TEMPLATES))
      }
    } else {
      setTemplates(DEFAULT_TEMPLATES)
      localStorage.setItem('crmzap-message-templates', JSON.stringify(DEFAULT_TEMPLATES))
    }
    // UX #654: Load template usage stats
    const savedUsage = localStorage.getItem('crmzap-template-usage')
    if (savedUsage) {
      try {
        setTemplateUsage(JSON.parse(savedUsage))
      } catch {
        setTemplateUsage({})
      }
    }
    // UX: Focus search on open
    setTimeout(() => searchInputRef.current?.focus(), 100)
  }, [])

  // Bug fix #650: Track unsaved changes
  const hasUnsavedChanges = isEditing && (newName.trim() !== '' || newContent.trim() !== '')

  // UX #58: Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDiscardWarning) {
          setShowDiscardWarning(false)
        } else if (previewTemplate) {
          setPreviewTemplate(null)
        } else if (deleteConfirm) {
          setDeleteConfirm(null)
        } else if (hasUnsavedChanges) {
          // Bug fix #650: Show warning before discarding
          setShowDiscardWarning(true)
        } else if (isEditing || editingTemplate) {
          setIsEditing(false)
          setEditingTemplate(null)
          setNewName('')
          setNewContent('')
        } else {
          onClose()
        }
      }
      // UX #504: Enter to confirm preview and send
      if (e.key === 'Enter' && previewTemplate && !e.shiftKey) {
        e.preventDefault()
        onSelect(previewTemplate.content)
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isEditing, editingTemplate, deleteConfirm, previewTemplate, onSelect])

  const saveTemplates = (newTemplates: Template[]) => {
    setTemplates(newTemplates)
    localStorage.setItem('crmzap-message-templates', JSON.stringify(newTemplates))
  }

  const handleSelect = (template: Template) => {
    // UX #654: Track template usage
    const newUsage = { ...templateUsage, [template.id]: (templateUsage[template.id] || 0) + 1 }
    setTemplateUsage(newUsage)
    localStorage.setItem('crmzap-template-usage', JSON.stringify(newUsage))
    
    onSelect(template.content)
    onClose()
  }
  
  // Bug fix #650: Safe close that checks for unsaved changes
  const handleSafeClose = () => {
    if (hasUnsavedChanges) {
      setShowDiscardWarning(true)
    } else {
      onClose()
    }
  }

  const handleCopy = (template: Template) => {
    navigator.clipboard.writeText(template.content)
    setCopiedId(template.id)
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(10)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // UX #55: Start editing an existing template
  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setNewName(template.name)
    setNewContent(template.content)
    setIsEditing(true)
  }

  // Bug fix #56: Confirm before delete
  const handleDeleteConfirm = (id: string) => {
    setDeleteConfirm(id)
  }

  const handleDelete = (id: string) => {
    const newTemplates = templates.filter(t => t.id !== id)
    saveTemplates(newTemplates)
    setDeleteConfirm(null)
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate([5, 50, 5])
  }

  // UX #59: Reset to default templates
  const handleResetDefaults = () => {
    saveTemplates(DEFAULT_TEMPLATES)
    setDeleteConfirm(null)
  }

  // UX #180: Duplicate template for quick variations
  const handleDuplicate = (template: Template) => {
    const newTemplate: Template = {
      id: Date.now().toString(),
      name: `${template.name} (cópia)`,
      content: template.content
    }
    const newTemplates = [...templates, newTemplate]
    saveTemplates(newTemplates)
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(10)
    // Start editing the duplicate immediately
    setEditingTemplate(newTemplate)
    setNewName(newTemplate.name)
    setNewContent(newTemplate.content)
    setIsEditing(true)
  }

  const handleAdd = () => {
    if (!newName.trim() || !newContent.trim()) return
    
    // Bug fix #60: Check for duplicate names (case insensitive)
    const nameExists = templates.some(t => 
      t.name.toLowerCase() === newName.trim().toLowerCase() && 
      t.id !== editingTemplate?.id
    )
    if (nameExists) {
      // Show visual feedback - shake the name input
      const nameInput = document.querySelector('[data-template-name-input]') as HTMLInputElement
      if (nameInput) {
        nameInput.classList.add('animate-shake', 'border-red-500')
        setTimeout(() => nameInput.classList.remove('animate-shake', 'border-red-500'), 500)
      }
      return
    }
    
    if (editingTemplate) {
      // Update existing template
      const updatedTemplates = templates.map(t => 
        t.id === editingTemplate.id 
          ? { ...t, name: newName.trim(), content: newContent.trim() }
          : t
      )
      saveTemplates(updatedTemplates)
    } else {
      // Add new template
      const newTemplate: Template = {
        id: Date.now().toString(),
        name: newName.trim(),
        content: newContent.trim()
      }
      saveTemplates([...templates, newTemplate])
    }
    
    setNewName('')
    setNewContent('')
    setIsEditing(false)
    setEditingTemplate(null)
  }

  // UX #654: Sort templates by usage (most used first), then filter by search
  const filteredTemplates = templates
    .filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (templateUsage[b.id] || 0) - (templateUsage[a.id] || 0))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0 duration-150" onClick={handleSafeClose}>
      <div 
        className="bg-background rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#25D366]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Templates Rápidos</h3>
              <p className="text-xs text-muted-foreground">{templates.length} templates</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* UX #59: Reset to defaults button */}
            <button 
              onClick={() => setDeleteConfirm('__reset__')} 
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              title="Restaurar padrões"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={handleSafeClose} className="p-1.5 hover:bg-muted rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bug fix #650: Discard warning modal */}
        {showDiscardWarning && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 rounded-xl animate-in fade-in-0 duration-150">
            <div className="bg-background rounded-lg p-4 shadow-xl m-4 max-w-[280px] animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Descartar alterações?</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Você tem alterações não salvas. Deseja descartar?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowDiscardWarning(false)}
                >
                  Continuar editando
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setShowDiscardWarning(false)
                    setIsEditing(false)
                    setEditingTemplate(null)
                    setNewName('')
                    setNewContent('')
                    onClose()
                  }}
                >
                  Descartar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="p-3 border-b">
          <Input
            ref={searchInputRef}
            placeholder="Buscar template... (ESC para fechar)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* UX #504: Preview Panel */}
        {previewTemplate && (
          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-green-700 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Preview: {previewTemplate.name}
              </span>
              <button 
                onClick={() => setPreviewTemplate(null)}
                className="text-green-600 hover:text-green-800 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-white rounded-lg p-3 text-sm border border-green-200 shadow-sm max-h-24 overflow-y-auto">
              {previewTemplate.content}
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={() => setPreviewTemplate(null)}
              >
                Voltar
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 text-xs bg-[#25D366] hover:bg-[#20bd5a] text-black"
                onClick={() => {
                  onSelect(previewTemplate.content)
                  onClose()
                }}
              >
                <Check className="w-3 h-3 mr-1" />
                Usar Template
              </Button>
            </div>
            <p className="text-[10px] text-green-600 mt-2 text-center">
              Pressione Enter para usar ou Esc para voltar
            </p>
          </div>
        )}

        {/* Templates List */}
        <div className="overflow-y-auto max-h-[50vh] p-2">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className={`p-3 rounded-lg cursor-pointer group transition-all mb-1 ${
                deleteConfirm === template.id 
                  ? 'bg-red-50 border border-red-200' 
                  : previewTemplate?.id === template.id
                    ? 'bg-green-50 border border-green-300 ring-1 ring-green-400'
                    : 'hover:bg-muted/50'
              }`}
              onClick={() => {
                if (deleteConfirm !== template.id) {
                  // UX #504: Single click shows preview, double click sends immediately
                  if (previewTemplate?.id === template.id) {
                    handleSelect(template)
                  } else {
                    setPreviewTemplate(template)
                  }
                }
              }}
              onDoubleClick={() => deleteConfirm !== template.id && handleSelect(template)}
            >
              {/* Bug fix #56: Delete confirmation inline */}
              {deleteConfirm === template.id ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Excluir "{template.name}"?</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }}
                      className="px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80"
                    >
                      Não
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(template.id) }}
                      className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600"
                    >
                      Sim
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {template.name}
                      {/* UX #654: Show usage count for frequently used templates */}
                      {templateUsage[template.id] > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-normal">
                          {templateUsage[template.id]}x
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {template.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* UX #55: Edit button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(template) }}
                      className="p-1.5 hover:bg-blue-50 rounded"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                    {/* UX #180: Duplicate button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(template) }}
                      className="p-1.5 hover:bg-green-50 rounded"
                      title="Duplicar"
                    >
                      <CopyPlus className="w-3.5 h-3.5 text-green-500" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(template) }}
                      className="p-1.5 hover:bg-muted rounded"
                      title="Copiar texto"
                    >
                      {copiedId === template.id ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteConfirm(template.id) }}
                      className="p-1.5 hover:bg-red-50 rounded"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {search ? 'Nenhum template encontrado' : 'Nenhum template criado'}
            </div>
          )}
          
          {/* UX #651: Hint about double-click */}
          {filteredTemplates.length > 0 && !previewTemplate && (
            <div className="text-center text-[10px] text-muted-foreground/70 py-2 border-t mt-1">
              💡 Clique para preview • Duplo clique para usar direto
            </div>
          )}
        </div>

        {/* Reset confirmation */}
        {deleteConfirm === '__reset__' && (
          <div className="border-t p-3 bg-amber-50">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-700 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Restaurar templates padrão?</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80"
                >
                  Não
                </button>
                <button
                  onClick={handleResetDefaults}
                  className="px-2 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600"
                >
                  Sim
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Template */}
        <div className="border-t p-3">
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {editingTemplate ? `Editando: ${editingTemplate.name}` : 'Novo template'}
                </span>
              </div>
              <Input
                data-template-name-input
                placeholder="Nome do template"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm transition-colors"
                autoFocus
              />
              {/* Bug fix #143: Template content with character limit indicator */}
              <div className="relative">
                <textarea
                  placeholder="Conteúdo da mensagem...&#10;Dica: Use [NOME], [VALOR], etc. como placeholders"
                  value={newContent}
                  onChange={(e) => {
                    // Limit to 1000 characters
                    if (e.target.value.length <= 1000) {
                      setNewContent(e.target.value)
                    }
                  }}
                  className={`w-full h-24 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#25D366] transition-shadow ${
                    newContent.length > 900 ? 'border-amber-400' : ''
                  } ${newContent.length >= 1000 ? 'border-red-400' : ''}`}
                />
                <span className={`absolute bottom-2 right-2 text-[10px] ${
                  newContent.length >= 1000 ? 'text-red-500 font-medium' :
                  newContent.length > 900 ? 'text-amber-500' :
                  newContent.length > 500 ? 'text-muted-foreground' : 'text-muted-foreground/50'
                }`}>
                  {newContent.length}/1000
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setIsEditing(false)
                    setEditingTemplate(null)
                    setNewName('')
                    setNewContent('')
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-black"
                  onClick={handleAdd}
                  disabled={!newName.trim() || !newContent.trim()}
                >
                  {editingTemplate ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsEditing(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Criar novo template
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Button to trigger template picker
interface TemplateButtonProps {
  onSelect: (content: string) => void
}

export function TemplateButton({ onSelect }: TemplateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-muted rounded-lg transition-colors"
        title="Templates rápidos"
      >
        <MessageSquarePlus className="w-5 h-5 text-muted-foreground" />
      </button>

      {isOpen && (
        <TemplatePicker
          onSelect={onSelect}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
