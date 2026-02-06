'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Bell, Moon, Sun, Smartphone, Download, Trash2, Loader2, Columns, GripVertical, Eye, EyeOff, Plus, RotateCcw } from 'lucide-react'
import { getUser } from '@/lib/supabase-client'
import { useSettings } from '@/components/theme-provider'
import { SettingsNav } from '@/components/settings-nav'

interface KanbanColumn {
  id: string
  label: string
  color: string
  bgColor: string
  visible: boolean
}

export const defaultKanbanColumns: KanbanColumn[] = [
  { id: 'novo', label: 'Novo', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', visible: true },
  { id: 'em_contato', label: 'Em Contato', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', visible: true },
  { id: 'negociando', label: 'Negociando', color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200', visible: true },
  { id: 'fechado', label: 'Fechado', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', visible: true },
  { id: 'perdido', label: 'Perdido', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200', visible: true },
]

export default function SettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const { settings, updateSetting } = useSettings()
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>(defaultKanbanColumns)

  useEffect(() => {
    async function load() {
      try {
        const { user, error } = await getUser()
        if (error || !user) {
          router.push('/login')
          return
        }
        // Load kanban columns
        const savedColumns = localStorage.getItem('whatszap-kanban-columns')
        if (savedColumns) {
          setKanbanColumns(JSON.parse(savedColumns))
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [router])

  const handleUpdateSetting = (key: Parameters<typeof updateSetting>[0], value: boolean) => {
    updateSetting(key, value)
    setMessage({ type: 'success', text: 'Configuração salva!' })
    setTimeout(() => setMessage(null), 2000)
  }

  const updateColumnLabel = (id: string, label: string) => {
    const updated = kanbanColumns.map(col => col.id === id ? { ...col, label } : col)
    setKanbanColumns(updated)
    localStorage.setItem('whatszap-kanban-columns', JSON.stringify(updated))
  }

  const toggleColumnVisibility = (id: string) => {
    const updated = kanbanColumns.map(col => col.id === id ? { ...col, visible: !col.visible } : col)
    setKanbanColumns(updated)
    localStorage.setItem('whatszap-kanban-columns', JSON.stringify(updated))
    setMessage({ type: 'success', text: 'Coluna atualizada!' })
    setTimeout(() => setMessage(null), 2000)
  }

  const resetColumns = () => {
    setKanbanColumns(defaultKanbanColumns)
    localStorage.setItem('whatszap-kanban-columns', JSON.stringify(defaultKanbanColumns))
    setMessage({ type: 'success', text: 'Colunas restauradas!' })
    setTimeout(() => setMessage(null), 2000)
  }

  // Drag & Drop state (desktop + mobile touch)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null)
  const [touchY, setTouchY] = useState<number | null>(null)
  const columnRefs = useRef<(HTMLDivElement | null)[]>([])

  // Desktop drag handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }
    
    const updated = [...kanbanColumns]
    const [removed] = updated.splice(draggedIndex, 1)
    updated.splice(index, 0, removed)
    setKanbanColumns(updated)
    localStorage.setItem('whatszap-kanban-columns', JSON.stringify(updated))
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Mobile touch drag handlers
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    setDraggedIndex(index)
    setTouchY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null || touchY === null) return
    
    const currentY = e.touches[0].clientY
    
    // Find which column we're over
    for (let i = 0; i < columnRefs.current.length; i++) {
      const ref = columnRefs.current[i]
      if (ref && i !== draggedIndex) {
        const rect = ref.getBoundingClientRect()
        if (currentY >= rect.top && currentY <= rect.bottom) {
          setDragOverIndex(i)
          return
        }
      }
    }
    setDragOverIndex(null)
  }

  const handleTouchEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const updated = [...kanbanColumns]
      const [removed] = updated.splice(draggedIndex, 1)
      updated.splice(dragOverIndex, 0, removed)
      setKanbanColumns(updated)
      localStorage.setItem('whatszap-kanban-columns', JSON.stringify(updated))
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
    setTouchY(null)
  }

  // Color options for new columns
  const colorOptions = [
    { color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
    { color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
    { color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
    { color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
    { color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' },
    { color: 'text-pink-600', bgColor: 'bg-pink-50 border-pink-200' },
    { color: 'text-cyan-600', bgColor: 'bg-cyan-50 border-cyan-200' },
    { color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200' },
    { color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200' },
  ]

  const addColumn = () => {
    const newId = `custom_${Date.now()}`
    const colorIndex = kanbanColumns.length % colorOptions.length
    const newCol: KanbanColumn = {
      id: newId,
      label: 'Nova Coluna',
      color: colorOptions[colorIndex].color,
      bgColor: colorOptions[colorIndex].bgColor,
      visible: true
    }
    const updated = [...kanbanColumns, newCol]
    setKanbanColumns(updated)
    localStorage.setItem('whatszap-kanban-columns', JSON.stringify(updated))
    setMessage({ type: 'success', text: 'Coluna adicionada!' })
    setTimeout(() => setMessage(null), 2000)
  }

  const deleteColumn = (id: string) => {
    if (kanbanColumns.length <= 1) {
      setMessage({ type: 'error', text: 'Você precisa ter pelo menos 1 coluna!' })
      setTimeout(() => setMessage(null), 2000)
      return
    }
    const updated = kanbanColumns.filter(col => col.id !== id)
    setKanbanColumns(updated)
    localStorage.setItem('whatszap-kanban-columns', JSON.stringify(updated))
    setMessage({ type: 'success', text: 'Coluna removida!' })
    setTimeout(() => setMessage(null), 2000)
  }

  const updateColumnColor = (id: string, colorIndex: number) => {
    const updated = kanbanColumns.map(col => 
      col.id === id 
        ? { ...col, color: colorOptions[colorIndex].color, bgColor: colorOptions[colorIndex].bgColor }
        : col
    )
    setKanbanColumns(updated)
    localStorage.setItem('whatszap-kanban-columns', JSON.stringify(updated))
  }

  // Bug fix #10: Export completo com todos os dados
  const exportData = () => {
    try {
      const leads = localStorage.getItem('whatszap-leads-v3') || '[]'
      const savedSettings = localStorage.getItem('whatszap-settings') || '{}'
      const savedColumns = localStorage.getItem('whatszap-kanban-columns') || '[]'
      const readLeads = localStorage.getItem('whatszap-read-leads') || '[]'
      
      const parsedLeads = JSON.parse(leads)
      
      // Estatísticas para o export
      const stats = {
        totalLeads: parsedLeads.length,
        leadsWithTags: parsedLeads.filter((l: any) => l.tags?.length > 0).length,
        leadsWithReminders: parsedLeads.filter((l: any) => l.reminderDate).length,
        leadsWithValue: parsedLeads.filter((l: any) => l.value > 0).length,
        totalValue: parsedLeads.reduce((acc: number, l: any) => acc + (l.value || 0), 0)
      }
      
      const data = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        stats,
        leads: parsedLeads,
        settings: JSON.parse(savedSettings),
        kanbanColumns: JSON.parse(savedColumns),
        readLeads: JSON.parse(readLeads)
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `whatszap-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: `Backup exportado! ${stats.totalLeads} leads.` })
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao exportar dados.' })
    }
  }

  // Bug fix #13: Importar dados de backup
  // Bug fix #353: Validate backup version and structure
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        // Bug fix #353: Validate backup structure
        if (!data.leads || !Array.isArray(data.leads)) {
          setMessage({ type: 'error', text: 'Arquivo de backup inválido. Estrutura incorreta.' })
          return
        }
        
        // Bug fix #353: Validate version compatibility
        const supportedVersions = ['1.0.0', '1.0.1', '1.1.0']
        if (data.version && !supportedVersions.includes(data.version)) {
          setMessage({ type: 'error', text: `Versão de backup incompatível: ${data.version}. Suportadas: ${supportedVersions.join(', ')}` })
          return
        }
        
        // Bug fix #353: Validate lead structure (basic sanity check)
        const invalidLeads = data.leads.filter((lead: any) => !lead.id || !lead.phone)
        if (invalidLeads.length > 0) {
          setMessage({ type: 'error', text: `Backup contém ${invalidLeads.length} leads inválidos (sem id ou telefone).` })
          return
        }
        
        // Importar dados
        localStorage.setItem('whatszap-leads-v3', JSON.stringify(data.leads))
        if (data.settings) {
          localStorage.setItem('whatszap-settings', JSON.stringify(data.settings))
        }
        if (data.kanbanColumns) {
          localStorage.setItem('whatszap-kanban-columns', JSON.stringify(data.kanbanColumns))
        }
        if (data.readLeads) {
          localStorage.setItem('whatszap-read-leads', JSON.stringify(data.readLeads))
        }
        
        // Bug fix #353: Show export date in success message
        const exportDate = data.exportedAt ? new Date(data.exportedAt).toLocaleDateString('pt-BR') : 'desconhecida'
        setMessage({ type: 'success', text: `Backup restaurado! ${data.leads.length} leads importados (backup de ${exportDate}).` })
        setTimeout(() => window.location.reload(), 1500)
      } catch (err) {
        setMessage({ type: 'error', text: 'Erro ao ler arquivo de backup. Verifique se é um JSON válido.' })
      }
    }
    reader.readAsText(file)
    // Limpar input para permitir importar mesmo arquivo novamente
    event.target.value = ''
  }

  // Bug fix #9: Estado para modal de confirmação
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  
  const clearAllData = () => {
    setShowClearConfirm(true)
  }
  
  const confirmClearData = () => {
    localStorage.removeItem('whatszap-leads-v3')
    localStorage.removeItem('whatszap-read-leads')
    localStorage.removeItem('whatszap-settings')
    localStorage.removeItem('whatszap-kanban-columns')
    setMessage({ type: 'success', text: 'Todos os dados foram apagados.' })
    setShowClearConfirm(false)
    setTimeout(() => window.location.reload(), 1500)
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
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="font-semibold">Configurações</h1>
        </div>
      </header>

      <SettingsNav />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {message && (
          <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2 animate-in fade-in-0 slide-in-from-top-2 duration-300 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border-2 border-green-300 shadow-lg shadow-green-100' 
              : 'bg-red-100 text-red-800 border-2 border-red-300 shadow-lg shadow-red-100'
          }`}>
            {message.type === 'success' ? '✓' : '✕'} {message.text}
          </div>
        )}

        {/* Kanban Columns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Columns className="w-5 h-5" />
                  Colunas do Kanban
                </CardTitle>
                <CardDescription>Personalize as colunas do seu funil de vendas</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={resetColumns}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Restaurar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {kanbanColumns.map((col, index) => (
              <div 
                key={col.id}
                ref={(el) => { columnRefs.current[index] = el }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all touch-none ${
                  col.visible ? 'bg-background' : 'bg-muted/50 opacity-60'
                } ${draggedIndex === index ? 'opacity-50 scale-[0.98] cursor-grabbing' : 'cursor-grab'} ${
                  dragOverIndex === index && draggedIndex !== index ? 'border-primary border-2 bg-primary/5' : ''
                }`}
              >
                {/* Drag Handle - works on both desktop and mobile */}
                <div className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none">
                  <GripVertical className="w-5 h-5" />
                </div>
                
                {/* Color Picker */}
                <div className="relative">
                  <button 
                    onClick={() => setColorPickerOpen(colorPickerOpen === col.id ? null : col.id)}
                    className={`w-4 h-8 rounded cursor-pointer ${col.bgColor.split(' ')[0]} hover:ring-2 hover:ring-primary/50 transition`} 
                  />
                  {colorPickerOpen === col.id && (
                    <div className="absolute left-0 top-full mt-1 flex flex-wrap gap-1 p-2 bg-popover border rounded-lg shadow-lg z-10 w-24">
                      {colorOptions.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => { updateColumnColor(col.id, i); setColorPickerOpen(null) }}
                          className={`w-5 h-5 rounded ${opt.bgColor.split(' ')[0]} hover:scale-110 transition border`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Label Input */}
                <Input 
                  value={col.label}
                  onChange={(e) => updateColumnLabel(col.id, e.target.value)}
                  className="flex-1 h-8 text-sm"
                  placeholder="Nome da coluna"
                />
                
                {/* Visibility Toggle */}
                <button
                  onClick={() => toggleColumnVisibility(col.id)}
                  className={`p-1.5 rounded hover:bg-muted transition ${col.visible ? 'text-foreground' : 'text-muted-foreground'}`}
                  title={col.visible ? 'Ocultar coluna' : 'Mostrar coluna'}
                >
                  {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                
                {/* Delete Button */}
                <button
                  onClick={() => deleteColumn(col.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition"
                  title="Remover coluna"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {/* Add Column Button */}
            <button
              onClick={addColumn}
              className="w-full p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Adicionar Coluna</span>
            </button>
            
            <p className="text-xs text-muted-foreground pt-2">
              Arraste para reordenar. Toque na cor para trocar.
            </p>
            
            {/* Save Button */}
            <div className="pt-4 border-t mt-4">
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => {
                  localStorage.setItem('whatszap-kanban-columns', JSON.stringify(kanbanColumns))
                  setMessage({ type: 'success', text: '✅ Configurações salvas com sucesso!' })
                  setTimeout(() => setMessage(null), 3000)
                }}
              >
                💾 Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
            </CardTitle>
            <CardDescription>Configure como você recebe alertas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications">Notificações do navegador</Label>
                <p className="text-xs text-muted-foreground">Receber alertas de novas mensagens</p>
              </div>
              <Switch 
                id="notifications"
                checked={settings.notifications}
                onCheckedChange={(checked) => handleUpdateSetting('notifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="reminders">Lembretes de follow-up</Label>
                <p className="text-xs text-muted-foreground">Alertas para lembretes agendados</p>
              </div>
              <Switch 
                id="reminders"
                checked={settings.reminderNotifications}
                onCheckedChange={(checked) => handleUpdateSetting('reminderNotifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sound">Som de notificação</Label>
                <p className="text-xs text-muted-foreground">Tocar som ao receber mensagem</p>
              </div>
              <Switch 
                id="sound"
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => handleUpdateSetting('soundEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5" />
              Aparência
            </CardTitle>
            <CardDescription>Personalize a interface</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="darkMode">Modo escuro</Label>
                <p className="text-xs text-muted-foreground">Tema escuro para o dashboard</p>
              </div>
              <Switch 
                id="darkMode"
                checked={settings.darkMode}
                onCheckedChange={(checked) => handleUpdateSetting('darkMode', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="compact">Visualização compacta</Label>
                <p className="text-xs text-muted-foreground">Cards menores no kanban</p>
              </div>
              <Switch 
                id="compact"
                checked={settings.compactView}
                onCheckedChange={(checked) => handleUpdateSetting('compactView', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Dados
            </CardTitle>
            <CardDescription>Gerencie seus dados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Meta mensal configurável - Bug fix #83: Validação de input */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Meta mensal de vendas</Label>
                <p className="text-xs text-muted-foreground">Usada nos relatórios de previsão</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  className="w-28 h-8"
                  min="0"
                  step="100"
                  defaultValue={typeof window !== 'undefined' ? localStorage.getItem('whatszap-monthly-goal') || '10000' : '10000'}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    // Bug fix #83: Não permitir valores negativos ou NaN
                    if (!isNaN(value) && value >= 0) {
                      localStorage.setItem('whatszap-monthly-goal', value.toString())
                    } else if (e.target.value === '' || isNaN(value)) {
                      // Se campo vazio ou inválido, usar default
                      localStorage.setItem('whatszap-monthly-goal', '10000')
                    }
                  }}
                  onBlur={(e) => {
                    // Corrigir valor ao perder foco
                    const value = parseInt(e.target.value)
                    if (isNaN(value) || value < 0) {
                      e.target.value = '10000'
                      localStorage.setItem('whatszap-monthly-goal', '10000')
                    }
                  }}
                />
              </div>
            </div>
            <div className="border-t pt-4 flex items-center justify-between">
              <div>
                <Label>Exportar dados</Label>
                <p className="text-xs text-muted-foreground">Baixe backup dos seus leads</p>
              </div>
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
            {/* Bug fix #13: Importar backup */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Restaurar backup</Label>
                <p className="text-xs text-muted-foreground">Importe dados de um arquivo JSON</p>
              </div>
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                  id="import-file"
                />
                <label htmlFor="import-file">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Download className="w-4 h-4 mr-2 rotate-180" />
                      Importar
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>Ações irreversíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-red-600">Apagar todos os dados</Label>
                <p className="text-xs text-muted-foreground">Remove todos os leads e configurações</p>
              </div>
              <Button variant="destructive" size="sm" onClick={clearAllData}>
                <Trash2 className="w-4 h-4 mr-2" />
                Apagar tudo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Sobre
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>CRMzap</strong> - CRM para WhatsApp</p>
            <p>Versão: 1.0.0</p>
            <p>
              <Link href="/terms" className="text-primary hover:underline">Termos de Uso</Link>
              {' • '}
              <Link href="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>
            </p>
            <p>© 2026 CRMzap. Todos os direitos reservados.</p>
          </CardContent>
        </Card>
      </main>

      {/* Bug fix #9: Modal de confirmação para apagar dados */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-background rounded-lg p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold">Apagar Todos os Dados</h3>
                <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm mb-4 text-muted-foreground">
              Todos os seus leads, configurações, tags e lembretes serão permanentemente removidos.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={confirmClearData}
              >
                Apagar Tudo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
