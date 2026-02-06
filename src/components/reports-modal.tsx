'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  X, 
  BarChart3, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Users,
  Target,
  AlertTriangle,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  Loader2
} from 'lucide-react'
import jsPDF from 'jspdf'

type LeadStatus = 'novo' | 'em_contato' | 'negociando' | 'fechado' | 'perdido'
type LeadSource = 'whatsapp' | 'telegram' | 'instagram' | 'facebook' | 'unknown'

interface Lead {
  id: string
  name: string
  phone: string
  status: LeadStatus
  source: LeadSource
  value?: number
  tags?: string[]
  createdAt?: string
  reminderDate?: string
  lastMessage?: string
}

interface ReportsModalProps {
  leads: Lead[]
  onClose: () => void
}

// Heat map component for best times
function HeatMap({ data }: { data: number[][] }) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const hours = ['6h', '9h', '12h', '15h', '18h', '21h']
  const maxValue = Math.max(...data.flat())
  
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex gap-1">
          <div className="w-8" /> {/* Spacer for hours column */}
          {days.map(day => (
            <div key={day} className="w-10 text-center text-[10px] text-muted-foreground font-medium">
              {day}
            </div>
          ))}
        </div>
        {hours.map((hour, hourIdx) => (
          <div key={hour} className="flex gap-1 mt-1">
            <div className="w-8 text-[10px] text-muted-foreground flex items-center">{hour}</div>
            {days.map((day, dayIdx) => {
              const value = data[hourIdx]?.[dayIdx] || 0
              const intensity = maxValue > 0 ? value / maxValue : 0
              return (
                <div
                  key={`${day}-${hour}`}
                  className="w-10 h-6 rounded transition-colors"
                  style={{
                    backgroundColor: intensity > 0 
                      ? `rgba(34, 197, 94, ${0.2 + intensity * 0.8})` 
                      : 'rgb(241, 245, 249)'
                  }}
                  title={`${day} ${hour}: ${value} conversões`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// Progress bar component
function ProgressBar({ value, max, color = 'bg-green-500', showPercent = true }: { 
  value: number
  max: number
  color?: string
  showPercent?: boolean 
}) {
  const percent = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`} 
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {showPercent && (
        <span className="text-xs text-muted-foreground w-10 text-right">{percent.toFixed(0)}%</span>
      )}
    </div>
  )
}

// Stat card component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  trend,
  color = 'blue'
}: { 
  icon: React.ElementType
  label: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  }
  
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
  
  return (
    <div className={`rounded-lg p-3 border ${colors[color]}`}>
      <div className="flex items-start justify-between mb-1">
        <Icon className="w-4 h-4 opacity-70" />
        {trend && <TrendIcon className={`w-3 h-3 ${trendColor}`} />}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] opacity-70">{label}</div>
      {subValue && <div className="text-[10px] mt-1 opacity-50">{subValue}</div>}
    </div>
  )
}

// Timing data from API
interface TimingData {
  avgResponseTimeMinutes: number | null
  avgCycleDays: number | null
  heatMap: number[][] | null
  totalMessages: number
  analyzedConversations: number
  bestTime: { day: string; hour: string; count: number } | null
}

export function ReportsModal({ leads, onClose }: ReportsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'timing' | 'forecast'>('overview')
  const [timingData, setTimingData] = useState<TimingData | null>(null)
  const [timingLoading, setTimingLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [monthlyGoal, setMonthlyGoal] = useState(10000)

  // Load monthly goal from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('whatszap-monthly-goal')
    if (saved) setMonthlyGoal(parseInt(saved) || 10000)
  }, [])

  // Export to PDF - programmatic generation
  const handleExportPDF = async () => {
    if (exporting) return
    
    setExporting(true)
    
    try {
      // Fetch timing data if not already loaded
      let currentTimingData = timingData
      if (!currentTimingData) {
        try {
          const res = await fetch('/api/analytics/timing')
          const data = await res.json()
          if (data.success && data.data) {
            currentTimingData = data.data
            setTimingData(data.data)
          }
        } catch (err) {
          console.error('Failed to fetch timing data for PDF:', err)
        }
      }
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pageWidth = pdf.internal.pageSize.getWidth()
      let y = 20
      
      // Helper functions
      const addTitle = (text: string) => {
        pdf.setFontSize(18)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(30, 64, 175) // blue-800
        pdf.text(text, pageWidth / 2, y, { align: 'center' })
        y += 10
      }
      
      const addSubtitle = (text: string) => {
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(100, 100, 100)
        pdf.text(text, pageWidth / 2, y, { align: 'center' })
        y += 12
      }
      
      const addSectionTitle = (text: string) => {
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(50, 50, 50)
        pdf.text(text, 15, y)
        y += 8
      }
      
      const addStat = (label: string, value: string, x: number) => {
        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(30, 30, 30)
        pdf.text(value, x, y)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(100, 100, 100)
        pdf.text(label, x, y + 5)
      }
      
      const addProgressBar = (label: string, value: number, total: number, x: number, width: number) => {
        const percent = total > 0 ? (value / total) * 100 : 0
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(60, 60, 60)
        pdf.text(label, x, y)
        
        // Background bar
        pdf.setFillColor(230, 230, 230)
        pdf.rect(x, y + 2, width, 4, 'F')
        
        // Progress bar
        const barColor = percent > 30 ? [34, 197, 94] : percent > 15 ? [245, 158, 11] : [239, 68, 68]
        pdf.setFillColor(barColor[0], barColor[1], barColor[2])
        pdf.rect(x, y + 2, width * (percent / 100), 4, 'F')
        
        // Percentage text
        pdf.text(`${value}/${total} (${percent.toFixed(0)}%)`, x + width + 5, y + 4)
        y += 12
      }
      
      // Title
      addTitle('Relatório de Vendas')
      addSubtitle(`${metrics.total} leads · Gerado em ${new Date().toLocaleDateString('pt-BR')}`)
      
      // Main Stats
      addSectionTitle('Visão Geral')
      addStat('Total de Leads', metrics.total.toString(), 20)
      addStat('Taxa de Conversão', `${metrics.taxaConversao.toFixed(1)}%`, 70)
      addStat('Em Negociação', metrics.byStatus.negociando.toString(), 120)
      addStat('Fechados', metrics.byStatus.fechado.toString(), 170)
      y += 18
      
      // Funnel
      addSectionTitle('Funil de Conversão')
      const funnel = [
        { label: 'Novos', count: metrics.byStatus.novo, color: [59, 130, 246] },
        { label: 'Em Contato', count: metrics.byStatus.em_contato, color: [245, 158, 11] },
        { label: 'Negociando', count: metrics.byStatus.negociando, color: [168, 85, 247] },
        { label: 'Fechados', count: metrics.byStatus.fechado, color: [34, 197, 94] },
        { label: 'Perdidos', count: metrics.byStatus.perdido, color: [156, 163, 175] },
      ]
      
      funnel.forEach((stage, idx) => {
        const barWidth = 120 - idx * 15
        pdf.setFillColor(stage.color[0], stage.color[1], stage.color[2])
        pdf.rect(15, y, barWidth, 8, 'F')
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(255, 255, 255)
        pdf.text(stage.label, 18, y + 5.5)
        pdf.text(stage.count.toString(), 15 + barWidth - 10, y + 5.5)
        y += 10
      })
      y += 8
      
      // Source Performance
      addSectionTitle('Desempenho por Fonte')
      const sourceLabels: Record<string, string> = {
        whatsapp: 'WhatsApp',
        telegram: 'Telegram',
        instagram: 'Instagram',
        facebook: 'Facebook',
        unknown: 'Outros'
      }
      
      Object.entries(metrics.bySource)
        .filter(([_, data]) => data.total > 0)
        .sort((a, b) => b[1].converted - a[1].converted)
        .forEach(([source, data]) => {
          addProgressBar(sourceLabels[source], data.converted, data.total, 15, 80)
        })
      
      // Conversion Rates
      y += 5
      addSectionTitle('Taxas de Conversão')
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(60, 60, 60)
      pdf.text(`Novo → Contato: ${metrics.funnelRates.novoToContato.toFixed(0)}%`, 20, y)
      pdf.text(`Contato → Negociação: ${metrics.funnelRates.contatoToNegociando.toFixed(0)}%`, 80, y)
      pdf.text(`Negociação → Fechado: ${metrics.funnelRates.negociandoToFechado.toFixed(0)}%`, 150, y)
      y += 10
      
      // Follow-up alert
      if (metrics.leadsEsfriando > 0) {
        y += 5
        pdf.setFillColor(254, 243, 199) // amber-100
        pdf.rect(15, y - 5, pageWidth - 30, 15, 'F')
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(180, 83, 9) // amber-700
        pdf.text(`⚠ ${metrics.leadsEsfriando} lead(s) sem contato há mais de 48h`, 20, y + 3)
        y += 15
      }
      
      // Timing Section
      y += 10
      addSectionTitle('Métricas de Tempo')
      
      if (currentTimingData && currentTimingData.totalMessages > 0) {
        // Response time box
        pdf.setFillColor(236, 253, 245) // green-50
        pdf.rect(15, y, 85, 25, 'F')
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(21, 128, 61) // green-700
        const responseTime = currentTimingData.avgResponseTimeMinutes !== null 
          ? `${currentTimingData.avgResponseTimeMinutes} min` 
          : '—'
        pdf.text(responseTime, 20, y + 10)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.text('Tempo Médio de Resposta', 20, y + 18)
        
        // Cycle time box
        pdf.setFillColor(245, 243, 255) // purple-50
        pdf.rect(105, y, 85, 25, 'F')
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(126, 34, 206) // purple-700
        const cycleTime = currentTimingData.avgCycleDays !== null 
          ? `${currentTimingData.avgCycleDays} dias` 
          : '—'
        pdf.text(cycleTime, 110, y + 10)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.text('Ciclo Médio de Venda', 110, y + 18)
        
        y += 30
        
        // Heat map (simplified version)
        if (currentTimingData.heatMap) {
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(50, 50, 50)
          pdf.text('Melhores Horários para Contato', 15, y)
          y += 6
          
          const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
          const hours = ['6h', '9h', '12h', '15h', '18h', '21h']
          const cellW = 12
          const cellH = 6
          const startX = 25
          const maxValue = Math.max(...currentTimingData.heatMap.flat())
          
          // Day headers
          pdf.setFontSize(7)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(100, 100, 100)
          days.forEach((day, i) => {
            pdf.text(day, startX + i * cellW + 2, y)
          })
          y += 4
          
          // Grid
          hours.forEach((hour, hourIdx) => {
            pdf.setTextColor(100, 100, 100)
            pdf.text(hour, 15, y + 4)
            
            days.forEach((_, dayIdx) => {
              const value = currentTimingData.heatMap![hourIdx]?.[dayIdx] || 0
              const intensity = maxValue > 0 ? value / maxValue : 0
              
              if (intensity > 0) {
                const green = Math.round(197 + (1 - intensity) * 58)
                pdf.setFillColor(34, green, 94)
              } else {
                pdf.setFillColor(241, 245, 249)
              }
              pdf.rect(startX + dayIdx * cellW, y, cellW - 1, cellH, 'F')
            })
            y += cellH + 1
          })
          y += 5
        }
        
        // Best time info
        if (currentTimingData.bestTime) {
          pdf.setFontSize(9)
          pdf.setTextColor(60, 60, 60)
          pdf.text(`Melhor horário: ${currentTimingData.bestTime.day}, ${currentTimingData.bestTime.hour}`, 15, y)
          y += 8
        }
      } else {
        pdf.setFontSize(9)
        pdf.setTextColor(100, 100, 100)
        pdf.text('Sem dados de tempo disponíveis. Importe conversas para ver métricas.', 15, y)
        y += 8
      }
      
      // Footer
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text('Gerado por CRMZap', pageWidth / 2, 285, { align: 'center' })
      
      const today = new Date().toISOString().split('T')[0]
      pdf.save(`relatorio-vendas-${today}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Erro ao exportar PDF. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  // Fetch timing data when Timing tab is opened
  useEffect(() => {
    if (activeTab === 'timing' && !timingData && !timingLoading) {
      setTimingLoading(true)
      fetch('/api/analytics/timing')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setTimingData(data.data)
          }
        })
        .catch(err => console.error('Failed to fetch timing data:', err))
        .finally(() => setTimingLoading(false))
    }
  }, [activeTab, timingData, timingLoading])
  
  // Calculate all metrics
  const metrics = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Filter leads by month
    const isThisMonth = (dateStr?: string) => {
      if (!dateStr) return false
      const d = new Date(dateStr)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }
    
    const isLastMonth = (dateStr?: string) => {
      if (!dateStr) return false
      const d = new Date(dateStr)
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear
      return d.getMonth() === lastMonth && d.getFullYear() === lastYear
    }
    
    const total = leads.length
    const byStatus = {
      novo: leads.filter(l => l.status === 'novo').length,
      em_contato: leads.filter(l => l.status === 'em_contato').length,
      negociando: leads.filter(l => l.status === 'negociando').length,
      fechado: leads.filter(l => l.status === 'fechado').length,
      perdido: leads.filter(l => l.status === 'perdido').length
    }
    
    const fechados = leads.filter(l => l.status === 'fechado')
    const valorTotal = fechados.reduce((acc, l) => acc + (l.value || 0), 0)
    const ticketMedio = fechados.length > 0 ? valorTotal / fechados.length : 0
    const taxaConversao = total > 0 ? (byStatus.fechado / total) * 100 : 0
    
    // This month's metrics
    const fechadosThisMonth = fechados.filter(l => isThisMonth(l.createdAt))
    const valorThisMonth = fechadosThisMonth.reduce((acc, l) => acc + (l.value || 0), 0)
    const leadsThisMonth = leads.filter(l => isThisMonth(l.createdAt)).length
    const conversaoThisMonth = leadsThisMonth > 0 ? (fechadosThisMonth.length / leadsThisMonth) * 100 : 0
    
    // Last month's metrics
    const fechadosLastMonth = fechados.filter(l => isLastMonth(l.createdAt))
    const valorLastMonth = fechadosLastMonth.reduce((acc, l) => acc + (l.value || 0), 0)
    const leadsLastMonth = leads.filter(l => isLastMonth(l.createdAt)).length
    const conversaoLastMonth = leadsLastMonth > 0 ? (fechadosLastMonth.length / leadsLastMonth) * 100 : 0
    
    // Calculate variations
    const variacaoValor = valorLastMonth > 0 ? ((valorThisMonth - valorLastMonth) / valorLastMonth) * 100 : (valorThisMonth > 0 ? 100 : 0)
    const variacaoLeads = leadsLastMonth > 0 ? ((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100 : (leadsThisMonth > 0 ? 100 : 0)
    const variacaoConversao = conversaoLastMonth > 0 ? conversaoThisMonth - conversaoLastMonth : 0
    
    // Pipeline value (leads em negociação)
    const negociando = leads.filter(l => l.status === 'negociando')
    const pipelineValue = negociando.reduce((acc, l) => acc + (l.value || 0), 0)
    const pipelinePrevisao = pipelineValue * 0.3 // 30% probability
    
    // Leads by source
    const bySource: Record<LeadSource, { total: number; converted: number; value: number }> = {
      whatsapp: { total: 0, converted: 0, value: 0 },
      telegram: { total: 0, converted: 0, value: 0 },
      instagram: { total: 0, converted: 0, value: 0 },
      facebook: { total: 0, converted: 0, value: 0 },
      unknown: { total: 0, converted: 0, value: 0 }
    }
    
    leads.forEach(l => {
      const source = l.source || 'unknown'
      bySource[source].total++
      if (l.status === 'fechado') {
        bySource[source].converted++
        bySource[source].value += l.value || 0
      }
    })
    
    // Funnel conversion rates
    const funnelRates = {
      novoToContato: byStatus.novo > 0 
        ? ((byStatus.em_contato + byStatus.negociando + byStatus.fechado) / (byStatus.novo + byStatus.em_contato + byStatus.negociando + byStatus.fechado)) * 100 
        : 0,
      contatoToNegociando: (byStatus.em_contato + byStatus.negociando + byStatus.fechado) > 0 
        ? ((byStatus.negociando + byStatus.fechado) / (byStatus.em_contato + byStatus.negociando + byStatus.fechado)) * 100 
        : 0,
      negociandoToFechado: (byStatus.negociando + byStatus.fechado) > 0 
        ? (byStatus.fechado / (byStatus.negociando + byStatus.fechado)) * 100 
        : 0
    }
    
    // Leads sem follow-up (novos há mais de 24h sem mudança de status)
    const leadsEsfriando = leads.filter(l => {
      if (l.status !== 'novo' && l.status !== 'em_contato') return false
      const created = l.createdAt ? new Date(l.createdAt) : now
      const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
      return hoursAgo > 48
    }).length
    
    const taxaFollowUp = total > 0 ? ((total - leadsEsfriando) / total) * 100 : 100
    
    return {
      total,
      byStatus,
      valorTotal,
      ticketMedio,
      taxaConversao,
      pipelineValue,
      pipelinePrevisao,
      bySource,
      funnelRates,
      leadsEsfriando,
      taxaFollowUp,
      // Month comparison
      valorThisMonth,
      valorLastMonth,
      variacaoValor,
      leadsThisMonth,
      leadsLastMonth,
      variacaoLeads,
      conversaoThisMonth,
      variacaoConversao
    }
  }, [leads])

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'funnel', label: 'Funil', icon: TrendingUp },
    { id: 'timing', label: 'Tempo', icon: Clock },
    { id: 'forecast', label: 'Previsão', icon: Target }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0 duration-150" onClick={onClose}>
      <div 
        className="bg-background rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Relatórios de Vendas</h2>
              <p className="text-xs text-muted-foreground">{metrics.total} leads · Atualizado agora</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF}
              disabled={exporting}
              className="gap-2"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {exporting ? 'Exportando...' : 'Exportar PDF'}
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs - UX #175: Improved mobile scrolling and touch targets */}
        <div className="border-b bg-muted/30 overflow-x-auto scrollbar-hide">
          <div className="flex px-2 sm:px-4 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap min-h-[48px] touch-manipulation active:bg-muted/50 ${
                  activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content - UX #175: Better mobile padding and scroll behavior */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 overscroll-contain">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Main Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard 
                  icon={Users} 
                  label="Total de Leads" 
                  value={metrics.total}
                  color="blue"
                />
                <StatCard 
                  icon={Target} 
                  label="Taxa de Conversão" 
                  value={`${metrics.taxaConversao.toFixed(1)}%`}
                  trend={metrics.taxaConversao > 20 ? 'up' : metrics.taxaConversao < 10 ? 'down' : 'neutral'}
                  color="green"
                />
                <StatCard 
                  icon={TrendingUp} 
                  label="Em Negociação" 
                  value={metrics.byStatus.negociando}
                  color="purple"
                />
                <StatCard 
                  icon={Zap} 
                  label="Fechados" 
                  value={metrics.byStatus.fechado}
                  color="amber"
                />
              </div>

              {/* Month Comparison */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Comparativo com Mês Anterior
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">R$ {metrics.valorThisMonth.toLocaleString('pt-BR')}</div>
                    <div className="text-xs text-muted-foreground">Receita este mês</div>
                    <div className={`text-xs font-medium mt-1 ${metrics.variacaoValor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.variacaoValor >= 0 ? '↑' : '↓'} {Math.abs(metrics.variacaoValor).toFixed(0)}% vs mês anterior
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.leadsThisMonth}</div>
                    <div className="text-xs text-muted-foreground">Leads este mês</div>
                    <div className={`text-xs font-medium mt-1 ${metrics.variacaoLeads >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.variacaoLeads >= 0 ? '↑' : '↓'} {Math.abs(metrics.variacaoLeads).toFixed(0)}% vs mês anterior
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.conversaoThisMonth.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Conversão este mês</div>
                    <div className={`text-xs font-medium mt-1 ${metrics.variacaoConversao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.variacaoConversao >= 0 ? '↑' : '↓'} {Math.abs(metrics.variacaoConversao).toFixed(1)}pp vs mês anterior
                    </div>
                  </div>
                </div>
              </div>

              {/* Source Performance */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Desempenho por Fonte
                </h3>
                <div className="space-y-3">
                  {Object.entries(metrics.bySource)
                    .filter(([_, data]) => data.total > 0)
                    .sort((a, b) => b[1].converted - a[1].converted)
                    .map(([source, data]) => {
                      const convRate = data.total > 0 ? (data.converted / data.total) * 100 : 0
                      const sourceLabels: Record<string, string> = {
                        whatsapp: '💬 WhatsApp',
                        telegram: '✈️ Telegram',
                        instagram: '📷 Instagram',
                        facebook: '👤 Facebook',
                        unknown: '❓ Outros'
                      }
                      return (
                        <div key={source} className="flex items-center gap-3">
                          <span className="w-28 text-sm">{sourceLabels[source]}</span>
                          <ProgressBar 
                            value={data.converted} 
                            max={data.total} 
                            color={convRate > 30 ? 'bg-green-500' : convRate > 15 ? 'bg-amber-500' : 'bg-red-400'}
                          />
                          <span className="text-xs text-muted-foreground w-20 text-right">
                            {data.converted}/{data.total} ({convRate.toFixed(0)}%)
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Alerts */}
              {metrics.leadsEsfriando > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 text-sm">Leads Esfriando</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      Você tem <strong>{metrics.leadsEsfriando} lead{metrics.leadsEsfriando > 1 ? 's' : ''}</strong> sem contato há mais de 48h. 
                      Faça follow-up para não perder a venda!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Funnel Tab */}
          {activeTab === 'funnel' && (
            <div className="space-y-6">
              {/* Visual Funnel */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm mb-4">Funil de Conversão</h3>
                
                {[
                  { label: 'Novos', count: metrics.byStatus.novo, color: 'bg-blue-500', width: '100%' },
                  { label: 'Em Contato', count: metrics.byStatus.em_contato, color: 'bg-amber-500', width: '85%' },
                  { label: 'Negociando', count: metrics.byStatus.negociando, color: 'bg-purple-500', width: '60%' },
                  { label: 'Fechados', count: metrics.byStatus.fechado, color: 'bg-green-500', width: '35%' },
                ].map((stage, idx) => (
                  <div key={stage.label} className="flex items-center gap-3">
                    <div 
                      className={`${stage.color} h-10 rounded-lg flex items-center justify-between px-4 transition-all`}
                      style={{ width: stage.width }}
                    >
                      <span className="text-white text-sm font-medium">{stage.label}</span>
                      <span className="text-white text-sm font-bold">{stage.count}</span>
                    </div>
                  </div>
                ))}
                
                <div className="flex items-center gap-3">
                  <div 
                    className="bg-gray-300 h-10 rounded-lg flex items-center justify-between px-4"
                    style={{ width: '25%' }}
                  >
                    <span className="text-gray-600 text-sm font-medium">Perdidos</span>
                    <span className="text-gray-600 text-sm font-bold">{metrics.byStatus.perdido}</span>
                  </div>
                </div>
              </div>

              {/* Conversion Rates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{metrics.funnelRates.novoToContato.toFixed(0)}%</div>
                  <div className="text-xs text-blue-600/70">Novo → Contato</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Taxa de resposta inicial</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{metrics.funnelRates.contatoToNegociando.toFixed(0)}%</div>
                  <div className="text-xs text-purple-600/70">Contato → Negociação</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Taxa de qualificação</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{metrics.funnelRates.negociandoToFechado.toFixed(0)}%</div>
                  <div className="text-xs text-green-600/70">Negociação → Fechado</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Taxa de fechamento</div>
                </div>
              </div>

              {/* Follow-up Rate */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">Taxa de Follow-up</h4>
                  <span className={`text-sm font-bold ${metrics.taxaFollowUp > 80 ? 'text-green-600' : 'text-amber-600'}`}>
                    {metrics.taxaFollowUp.toFixed(0)}%
                  </span>
                </div>
                <ProgressBar 
                  value={metrics.taxaFollowUp} 
                  max={100} 
                  color={metrics.taxaFollowUp > 80 ? 'bg-green-500' : 'bg-amber-500'}
                  showPercent={false}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {metrics.leadsEsfriando > 0 
                    ? `${metrics.leadsEsfriando} leads aguardando follow-up`
                    : 'Todos os leads estão sendo acompanhados!'}
                </p>
              </div>
            </div>
          )}

          {/* Timing Tab */}
          {activeTab === 'timing' && (
            <div className="space-y-6">
              {/* Loading State */}
              {timingLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-muted-foreground">Analisando mensagens...</span>
                </div>
              )}

              {/* No Data State */}
              {!timingLoading && timingData && timingData.totalMessages === 0 && (
                <div className="bg-muted/30 rounded-lg p-6 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <h3 className="font-medium mb-2">Sem dados suficientes</h3>
                  <p className="text-sm text-muted-foreground">
                    Importe conversas do WhatsApp para ver métricas de tempo.
                  </p>
                </div>
              )}

              {/* Data Available */}
              {!timingLoading && timingData && timingData.totalMessages > 0 && (
                <>
                  {/* Response Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <Clock className="w-5 h-5 text-green-600 mb-2" />
                      <div className="text-3xl font-bold text-green-700">
                        {timingData.avgResponseTimeMinutes !== null ? `${timingData.avgResponseTimeMinutes} min` : '—'}
                      </div>
                      <div className="text-xs text-green-600">Tempo Médio de Resposta</div>
                      <p className="text-[10px] text-green-700/70 mt-2">
                        {timingData.avgResponseTimeMinutes !== null ? (
                          timingData.avgResponseTimeMinutes <= 5 
                            ? '🎯 Excelente! Respostas rápidas aumentam conversão em 21x'
                            : timingData.avgResponseTimeMinutes <= 15
                            ? '👍 Bom tempo de resposta'
                            : '⚠️ Tente responder em menos de 5 minutos'
                        ) : 'Sem dados suficientes'}
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                      <Calendar className="w-5 h-5 text-purple-600 mb-2" />
                      <div className="text-3xl font-bold text-purple-700">
                        {timingData.avgCycleDays !== null ? `${timingData.avgCycleDays} dias` : '—'}
                      </div>
                      <div className="text-xs text-purple-600">Ciclo Médio de Venda</div>
                      <p className="text-[10px] text-purple-700/70 mt-2">
                        {timingData.avgCycleDays !== null 
                          ? 'Tempo do primeiro contato até fechar'
                          : 'Feche leads para calcular'}
                      </p>
                    </div>
                  </div>

                  {/* Heat Map */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Melhores Horários para Contato
                    </h3>
                    {timingData.heatMap && <HeatMap data={timingData.heatMap} />}
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>Menos ativo</span>
                      <div className="flex gap-1">
                        {[0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
                          <div 
                            key={i}
                            className="w-6 h-3 rounded"
                            style={{ backgroundColor: `rgba(34, 197, 94, ${intensity})` }}
                          />
                        ))}
                      </div>
                      <span>Mais ativo</span>
                    </div>
                    {timingData.bestTime && (
                      <p className="text-xs text-center text-muted-foreground mt-3">
                        💡 Melhor horário: <strong>{timingData.bestTime.day}, {timingData.bestTime.hour}</strong> — Seus leads respondem mais nesse período
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Forecast Tab */}
          {activeTab === 'forecast' && (
            <div className="space-y-6">
              {/* Pipeline */}
              <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl p-6 border">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  Previsão de Receita
                </h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Pipeline Total</div>
                    <div className="text-3xl font-bold text-purple-600">
                      R$ {metrics.pipelineValue.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {metrics.byStatus.negociando} leads em negociação
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Previsão (30% prob.)</div>
                    <div className="text-3xl font-bold text-green-600">
                      R$ {metrics.pipelinePrevisao.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Receita esperada este mês
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly projection */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-4">Projeção vs. Realizado</h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Meta do Mês</span>
                      <span className="font-medium">R$ {monthlyGoal.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gray-300" style={{ width: '100%' }} />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-600">Realizado</span>
                      <span className="font-medium text-green-600">R$ {metrics.valorTotal.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${Math.min((metrics.valorTotal / monthlyGoal) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-purple-600">+ Previsão Pipeline</span>
                      <span className="font-medium text-purple-600">R$ {(metrics.valorTotal + metrics.pipelinePrevisao).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-purple-500" 
                        style={{ width: `${Math.min(((metrics.valorTotal + metrics.pipelinePrevisao) / monthlyGoal) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-center text-muted-foreground mt-4">
                  {metrics.valorTotal + metrics.pipelinePrevisao >= monthlyGoal 
                    ? '🎉 Você está no caminho para bater a meta!'
                    : `📈 Faltam R$ ${(monthlyGoal - metrics.valorTotal - metrics.pipelinePrevisao).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} para a meta`}
                </p>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 text-sm mb-2">💡 Dicas para aumentar conversão</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Responda leads em menos de 5 minutos</li>
                  <li>• Faça follow-up em leads parados há mais de 24h</li>
                  <li>• Concentre contatos entre 15h-18h (melhor horário)</li>
                  <li>• Use tags para priorizar leads com alto interesse</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
