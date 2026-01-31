'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  Users, 
  Bell, 
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  Clock,
  Target,
  Zap,
  Star,
  ChevronRight
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl whatsapp-gradient flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl">WhatsZap</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition">Recursos</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">Preços</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition">FAQ</a>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/dashboard">
              <Button className="whatsapp-gradient text-white hover:opacity-90">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5">
            <Zap className="w-3 h-3 mr-1" />
            Novo: Lembretes automáticos de follow-up
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Pare de perder vendas no
            <span className="block mt-2 bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
              WhatsApp
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            CRM simples para quem vende pelo WhatsApp. Organize seus leads, nunca esqueça um follow-up.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/dashboard">
              <Button size="lg" className="whatsapp-gradient text-white hover:opacity-90 text-lg px-8 h-14">
                Testar Grátis por 7 Dias
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 h-14">
              <Smartphone className="mr-2 w-5 h-5" />
              Ver Demo
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Sem cartão de crédito</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Configuração em 2 min</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Cancele quando quiser</span>
            </div>
          </div>
        </div>
        
        {/* Hero Image - Kanban Preview */}
        <div className="mt-16 max-w-6xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="rounded-2xl border border-border/50 shadow-2xl overflow-hidden bg-card">
              <div className="p-4 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
              </div>
              <div className="p-6 grid grid-cols-5 gap-4">
                {['Novo', 'Em Contato', 'Negociando', 'Fechado', 'Perdido'].map((col, i) => (
                  <div key={col} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{col}</span>
                      <Badge variant="secondary" className="text-xs">{[3, 2, 1, 4, 1][i]}</Badge>
                    </div>
                    {Array.from({ length: [2, 1, 1, 2, 1][i] }).map((_, j) => (
                      <Card key={j} className="p-3 bg-background hover:shadow-md transition cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                            {['MS', 'JL', 'AC', 'PO', 'CL'][i]}
                          </div>
                          <div className="text-sm font-medium truncate">
                            {['Maria S.', 'João L.', 'Ana C.', 'Pedro O.', 'Carla L.'][i]}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {['Oi, quanto custa?', 'Vou pensar...', 'Fechamos?', 'Pix enviado! ✅', 'Achei outro...'][i]}
                        </p>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="container mx-auto px-4 py-20 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Você já passou por isso?
            </h2>
            <p className="text-xl text-muted-foreground">
              A maioria dos vendedores no WhatsApp enfrenta esses problemas diariamente
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 border-destructive/20 bg-destructive/5">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Esqueceu de responder</h3>
              <p className="text-muted-foreground">
                Aquele cliente interessado que mandou mensagem há 3 dias e você só viu agora. Já era.
              </p>
            </Card>
            
            <Card className="p-6 border-destructive/20 bg-destructive/5">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Não sabe quem é quem</h3>
              <p className="text-muted-foreground">
                &quot;Esse número aqui... era o do orçamento de R$500 ou o que pediu desconto?&quot;
              </p>
            </Card>
            
            <Card className="p-6 border-destructive/20 bg-destructive/5">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Follow-up? Que follow-up?</h3>
              <p className="text-muted-foreground">
                O cliente disse &quot;me liga amanhã&quot; mas amanhã virou semana passada.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Recursos</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simples. Direto. Funciona.
            </h2>
            <p className="text-xl text-muted-foreground">
              Sem complicação, sem curva de aprendizado. Abriu, usou.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 border-primary/20 hover:border-primary/40 transition">
              <div className="w-14 h-14 rounded-2xl whatsapp-gradient flex items-center justify-center mb-6">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-3">Kanban de Leads</h3>
              <p className="text-muted-foreground mb-4">
                Arrasta e solta. Veja exatamente onde cada cliente está no seu funil. 
                De &quot;Novo&quot; até &quot;Fechado&quot; em segundos.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  5 colunas personalizáveis
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Tags e cores para organizar
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Valor do negócio em cada card
                </li>
              </ul>
            </Card>
            
            <Card className="p-8 border-primary/20 hover:border-primary/40 transition">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center mb-6">
                <Bell className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-3">Lembretes de Follow-up</h3>
              <p className="text-muted-foreground mb-4">
                &quot;Me liga amanhã&quot; vira um lembrete automático. Nunca mais perde 
                uma venda por esquecimento.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Notificações no navegador
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Agenda de tarefas do dia
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Follow-ups pendentes em destaque
                </li>
              </ul>
            </Card>
            
            <Card className="p-8 border-primary/20 hover:border-primary/40 transition">
              <div className="w-14 h-14 rounded-2xl bg-violet-500 flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-3">Perfil do Cliente</h3>
              <p className="text-muted-foreground mb-4">
                Histórico completo de cada lead. O que conversaram, quanto vale, 
                de onde veio. Tudo num lugar.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Notas e observações
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Histórico de interações
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Link direto pro WhatsApp
                </li>
              </ul>
            </Card>
            
            <Card className="p-8 border-primary/20 hover:border-primary/40 transition">
              <div className="w-14 h-14 rounded-2xl bg-sky-500 flex items-center justify-center mb-6">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-3">Métricas Simples</h3>
              <p className="text-muted-foreground mb-4">
                Quanto você vendeu esse mês? Quantos leads perdeu? Taxa de conversão? 
                Respostas em segundos.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Dashboard visual
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Receita do período
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Taxa de conversão
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-20 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Preços</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simples e justo
            </h2>
            <p className="text-xl text-muted-foreground">
              Menos que o preço de uma pizza por mês
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="p-8">
              <h3 className="font-bold text-xl mb-2">Grátis</h3>
              <p className="text-muted-foreground mb-4">Para começar</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">R$0</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Até 50 leads
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Kanban básico
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  5 lembretes/mês
                </li>
              </ul>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full">
                  Começar Grátis
                </Button>
              </Link>
            </Card>
            
            <Card className="p-8 border-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                Popular
              </div>
              <h3 className="font-bold text-xl mb-2">Pro</h3>
              <p className="text-muted-foreground mb-4">Para quem vende sério</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">R$29</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Leads ilimitados
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Lembretes ilimitados
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Métricas e relatórios
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Suporte prioritário
                </li>
              </ul>
              <Link href="/dashboard">
                <Button className="w-full whatsapp-gradient text-white hover:opacity-90">
                  Testar 7 Dias Grátis
                  <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-20 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Perguntas Frequentes
            </h2>
          </div>
          
          <div className="space-y-6">
            {[
              {
                q: 'Como conecto meu WhatsApp?',
                a: 'Simples! Você escaneia um QR Code (igual ao WhatsApp Web) e pronto. Todas as suas conversas são sincronizadas automaticamente.'
              },
              {
                q: 'Funciona no celular?',
                a: 'Sim! O site é 100% responsivo. Abre no navegador do celular e funciona perfeitamente.'
              },
              {
                q: 'Posso responder clientes direto pelo sistema?',
                a: 'Sim! Você pode ver e responder todas as mensagens sem sair do WhatsZap. Chat integrado direto no dashboard.'
              },
              {
                q: 'Meus dados ficam seguros?',
                a: 'Sim. As mensagens ficam apenas no seu servidor. Você tem controle total dos seus dados.'
              },
            ].map((item, i) => (
              <Card key={i} className="p-6">
                <h3 className="font-semibold text-lg mb-2">{item.q}</h3>
                <p className="text-muted-foreground">{item.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-4xl mx-auto p-12 text-center whatsapp-gradient border-0">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Comece a vender mais hoje
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-xl mx-auto">
            Configure em 2 minutos. Teste grátis por 7 dias. Sem cartão de crédito.
          </p>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary" className="text-lg px-8 h-14">
              Criar Minha Conta Grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg whatsapp-gradient flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">WhatsZap</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 WhatsZap. Feito com 💚 para vendedores brasileiros.
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="ml-1">4.9/5 (127 avaliações)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
