'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  X, 
  ArrowRight, 
  ArrowLeft,
  MessageCircle, 
  Bell, 
  BarChart3, 
  Sparkles,
  CheckCircle2,
  Columns
} from 'lucide-react'

interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  position: 'center' | 'bottom-right' | 'bottom-left'
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao CRMzap! 🎉',
    description: 'Vamos fazer um tour rápido para você começar a vender mais. Leva menos de 1 minuto!',
    icon: Sparkles,
    position: 'center'
  },
  {
    id: 'kanban',
    title: 'Seu Pipeline de Vendas',
    description: 'Arraste os cards entre as colunas para organizar seus leads. De "Novo" até "Fechado" em poucos cliques!',
    icon: Columns,
    position: 'center'
  },
  {
    id: 'chat',
    title: 'Converse sem sair do sistema',
    description: 'Clique em qualquer lead para ver o histórico de conversas e responder direto daqui.',
    icon: MessageCircle,
    position: 'bottom-right'
  },
  {
    id: 'reminders',
    title: 'Nunca esqueça um follow-up',
    description: 'Clique no ícone de sino em qualquer lead para criar um lembrete. Você será notificado na hora certa!',
    icon: Bell,
    position: 'bottom-left'
  },
  {
    id: 'ai',
    title: 'IA que ajuda a vender',
    description: 'Clique em "Analisar com IA" para receber sugestões de como fechar a venda baseado na conversa.',
    icon: Sparkles,
    position: 'center'
  },
  {
    id: 'reports',
    title: 'Acompanhe seus resultados',
    description: 'Acesse "Relatórios" para ver métricas de vendas, funil de conversão e comparativo mensal.',
    icon: BarChart3,
    position: 'center'
  },
  {
    id: 'done',
    title: 'Pronto para vender! 🚀',
    description: 'Você já sabe o básico. Conecte seu WhatsApp e comece a organizar suas vendas!',
    icon: CheckCircle2,
    position: 'center'
  }
]

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Check if user already completed tour
    const completed = localStorage.getItem('crmzap-onboarding-completed')
    if (completed) return

    // Check if this is the dashboard page
    if (window.location.pathname === '/dashboard') {
      // Small delay to let the page render
      setTimeout(() => setIsOpen(true), 1000)
    }
  }, [])

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    setIsOpen(false)
    localStorage.setItem('crmzap-onboarding-completed', 'true')
  }

  const handleSkip = () => {
    setIsOpen(false)
    localStorage.setItem('crmzap-onboarding-completed', 'true')
  }

  if (!isOpen) return null

  const step = TOUR_STEPS[currentStep]
  const Icon = step.icon
  const isLast = currentStep === TOUR_STEPS.length - 1
  const isFirst = currentStep === 0

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[100]" 
        onClick={handleSkip}
      />
      
      {/* Tour Card */}
      <div 
        className={`fixed z-[101] w-[90%] max-w-md bg-background rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 ${
          step.position === 'center' 
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : step.position === 'bottom-right'
            ? 'bottom-24 right-4 md:right-8'
            : 'bottom-24 left-4 md:left-8'
        }`}
      >
        {/* Close button */}
        <button 
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg transition"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {TOUR_STEPS.map((_, idx) => (
            <div 
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentStep 
                  ? 'bg-[#25D366]' 
                  : idx < currentStep 
                  ? 'bg-[#25D366]/50' 
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-[#25D366]" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-center mb-2">{step.title}</h3>
        <p className="text-muted-foreground text-center text-sm mb-6">{step.description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={isFirst ? handleSkip : handlePrev}
            className="text-muted-foreground"
          >
            {isFirst ? (
              'Pular'
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handleNext}
            className="bg-[#25D366] hover:bg-[#20bd5a] text-black"
          >
            {isLast ? (
              <>
                Começar!
                <CheckCircle2 className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Próximo
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {/* Step counter */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          {currentStep + 1} de {TOUR_STEPS.length}
        </p>
      </div>
    </>
  )
}
