'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, CreditCard, Loader2, Zap, Crown } from 'lucide-react'
import { getUser } from '@/lib/supabase-client'
import { SettingsNav } from '@/components/settings-nav'

interface Subscription {
  plan: 'free' | 'pro'
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodEnd?: string
  leadsUsed: number
  leadsLimit: number
  remindersUsed: number
  remindersLimit: number
}

export default function SubscriptionPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState<Subscription>({
    plan: 'free',
    status: 'active',
    leadsUsed: 0,
    leadsLimit: 50,
    remindersUsed: 0,
    remindersLimit: 5
  })

  useEffect(() => {
    async function load() {
      try {
        const { user, error } = await getUser()
        if (error || !user) {
          router.push('/login')
          return
        }
        // Load subscription from localStorage (would be from API in production)
        const saved = localStorage.getItem('whatszap-subscription')
        if (saved) {
          setSubscription(JSON.parse(saved))
        }
        // Count leads
        const leads = localStorage.getItem('whatszap-leads-v3')
        if (leads) {
          const leadsData = JSON.parse(leads)
          setSubscription(prev => ({ ...prev, leadsUsed: leadsData.length }))
        }
      } catch (e) {
        console.error('Failed to load subscription:', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [router])

  const upgradeToPro = () => {
    // Would integrate with Stripe in production
    alert('Integração com pagamento em breve! Por enquanto, entre em contato: suporte@whatszap.com.br')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isPro = subscription.plan === 'pro'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="font-semibold">Assinatura</h1>
        </div>
      </header>

      <SettingsNav />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Current Plan */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Seu Plano Atual
                  <Badge variant={isPro ? 'default' : 'secondary'}>
                    {isPro ? 'Pro' : 'Grátis'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {isPro 
                    ? `Renovação em ${subscription.currentPeriodEnd || 'N/A'}`
                    : 'Você está no plano gratuito'}
                </CardDescription>
              </div>
              {isPro && (
                <Crown className="w-8 h-8 text-yellow-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {subscription.leadsUsed} / {isPro ? '∞' : subscription.leadsLimit}
                </div>
                <div className="text-sm text-muted-foreground">Leads utilizados</div>
                {!isPro && (
                  <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${Math.min((subscription.leadsUsed / subscription.leadsLimit) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {subscription.remindersUsed} / {isPro ? '∞' : subscription.remindersLimit}
                </div>
                <div className="text-sm text-muted-foreground">Lembretes este mês</div>
                {!isPro && (
                  <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${Math.min((subscription.remindersUsed / subscription.remindersLimit) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <h2 className="text-xl font-semibold mb-4">Planos Disponíveis</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <Card className={!isPro ? 'border-green-500 border-2' : ''}>
            <CardHeader>
              <CardTitle>Grátis</CardTitle>
              <CardDescription>Para começar</CardDescription>
              <div className="mt-2">
                <span className="text-3xl font-bold">R$0</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  'Até 50 leads',
                  'Kanban básico',
                  '5 lembretes por mês',
                  'Chat integrado'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full mt-6"
                disabled={!isPro}
              >
                {!isPro ? 'Plano atual' : 'Fazer downgrade'}
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className={isPro ? 'border-green-500 border-2' : 'border-primary'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Pro
                    <Badge>Popular</Badge>
                  </CardTitle>
                  <CardDescription>Para quem vende de verdade</CardDescription>
                </div>
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold">R$29</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  'Leads ilimitados',
                  'Lembretes ilimitados',
                  'Métricas e relatórios',
                  'Análise de IA nas conversas',
                  'Tags personalizadas',
                  'Suporte prioritário via WhatsApp',
                  'Exportar dados'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full mt-6"
                onClick={upgradeToPro}
                disabled={isPro}
              >
                {isPro ? (
                  'Plano atual'
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Assinar Pro - 7 dias grátis
                  </>
                )}
              </Button>
              {!isPro && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Cancele quando quiser. Sem compromisso.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">Posso cancelar a qualquer momento?</h4>
              <p className="text-sm text-muted-foreground">
                Sim! Você pode cancelar sua assinatura a qualquer momento, sem taxas ou burocracia.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Como funciona o período de teste?</h4>
              <p className="text-sm text-muted-foreground">
                Você tem 7 dias para testar todas as funcionalidades Pro gratuitamente. 
                Só cobramos após esse período.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Quais formas de pagamento são aceitas?</h4>
              <p className="text-sm text-muted-foreground">
                Aceitamos cartão de crédito, débito e Pix.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
