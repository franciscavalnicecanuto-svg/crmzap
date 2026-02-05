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
  Clock,
  Target,
  Zap,
  Star,
  ChevronRight,
  AlertTriangle,
  DollarSign,
  Calendar,
  BarChart3,
  Phone,
  X,
  Sparkles,
  Brain
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Grain overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] z-50" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} 
      />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-[#0a0a0a]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CRMzap" className="w-9 h-9 rounded-lg" />
            <span className="font-semibold text-lg tracking-tight">CRMzap</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#problema" className="text-white/50 hover:text-white transition-colors">Problema</a>
            <a href="#solucao" className="text-white/50 hover:text-white transition-colors">Solução</a>
            <a href="#preco" className="text-white/50 hover:text-white transition-colors">Preço</a>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/5">
                Entrar
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-[#25D366] text-black hover:bg-[#20bd5a] font-medium">
                Começar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero - Editorial Style */}
      <section className="min-h-screen flex items-center pt-16 relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#25D366]/5 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            {/* Stat badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
              <span className="text-white/70">R$ 847 bilhões vendidos via WhatsApp em 2025</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight">
              Quanto você
              <span className="block text-[#25D366]">perdeu</span>
              <span className="block text-white/40">esse mês?</span>
            </h1>
            
            <p className="text-xl text-white/60 max-w-lg leading-relaxed">
              Cada cliente que você esqueceu de responder foi uma venda perdida. 
              Cada follow-up que não fez virou receita do seu concorrente.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-[#25D366] text-black hover:bg-[#20bd5a] font-semibold h-14 px-8 text-base"
                onClick={() => window.location.href = '/signup'}
              >
                Parar de Perder Vendas
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                className="bg-white/10 border border-white/20 text-white hover:bg-white/20 h-14 px-8 text-base"
                onClick={() => document.getElementById('solucao')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver como funciona
              </Button>
            </div>
            
            {/* Trust signals */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-white/5 border-2 border-[#0a0a0a] flex items-center justify-center text-xs font-medium">
                    {['MS', 'JL', 'AC', 'PO', 'CL'][i-1]}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <span className="text-white font-medium">+2.340 vendedores</span>
                <span className="text-white/50"> já organizaram suas vendas</span>
              </div>
            </div>
          </div>
          
          {/* Dashboard Preview - Floating Cards Style */}
          <div className="relative lg:h-[600px] hidden lg:block">
            {/* Main card */}
            <div className="absolute top-10 right-0 w-[420px] rounded-2xl bg-[#111] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#25D366]" />
                  <span className="text-sm font-medium">Pipeline de Vendas</span>
                </div>
                <Badge className="bg-[#25D366]/20 text-[#25D366] border-0">11 leads ativos</Badge>
              </div>
              <div className="p-4 grid grid-cols-3 gap-3">
                {['Novo', 'Negociando', 'Fechado'].map((col, i) => (
                  <div key={col} className="space-y-2">
                    <div className="text-xs text-white/50 font-medium">{col}</div>
                    {[1, i === 1 ? 2 : 1].map((_, j) => (
                      <div key={j} className="p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[10px] font-medium text-[#25D366]">
                            {['MS', 'JL', 'AC'][i]}
                          </div>
                          <span className="text-xs font-medium truncate">
                            {['Maria S.', 'João L.', 'Ana C.'][i]}
                          </span>
                        </div>
                        <div className="text-[10px] text-white/40 truncate">
                          {['Oi, quanto custa?', 'Vou pensar...', 'Pix enviado! ✅'][i]}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Notification card */}
            <div className="absolute top-0 left-0 w-[280px] rounded-xl bg-[#111] border border-white/10 p-4 shadow-xl animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Lembrete de Follow-up</div>
                  <div className="text-xs text-white/50">Maria disse "me liga amanhã" há 23h</div>
                </div>
              </div>
            </div>
            
            {/* Stats card */}
            <div className="absolute bottom-20 left-10 w-[200px] rounded-xl bg-[#111] border border-white/10 p-4 shadow-xl">
              <div className="text-xs text-white/50 mb-2">Esse mês</div>
              <div className="text-3xl font-bold text-[#25D366]">R$ 12.450</div>
              <div className="text-xs text-white/50 mt-1">+23% vs mês anterior</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section - The Pain */}
      <section id="problema" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <Badge className="bg-red-500/10 text-red-400 border-red-500/20 mb-6">
              <AlertTriangle className="w-3 h-3 mr-1" />
              O problema que ninguém fala
            </Badge>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Você não tem um problema de vendas.
              <span className="text-white/40 block">Você tem um problema de organização.</span>
            </h2>
            
            <p className="text-xl text-white/50 mb-16">
              87% dos vendedores perdem pelo menos 3 clientes por semana simplesmente por esquecer de responder ou fazer follow-up.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: 'O cliente que sumiu',
                desc: '"Aquele lead que mandou mensagem na terça... era o do orçamento grande ou do pequeno? Onde foi parar?"',
                stat: '47%',
                statLabel: 'dos leads são perdidos por falta de follow-up'
              },
              {
                icon: DollarSign,
                title: 'O dinheiro que evaporou',
                desc: 'Cada "esqueci de responder" custa em média R$ 340. Multiplica por semana, por mês...',
                stat: 'R$ 4.080',
                statLabel: 'perdidos por mês em média'
              },
              {
                icon: Target,
                title: 'O concorrente que agradece',
                desc: 'Enquanto você procura conversa no WhatsApp, seu concorrente já fechou a venda.',
                stat: '2.3x',
                statLabel: 'mais chances de perder pra concorrência'
              }
            ].map((item, i) => (
              <Card key={i} className="bg-white/[0.02] border-white/5 p-6 hover:bg-white/[0.04] transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4 group-hover:bg-red-500/20 transition-colors">
                  <item.icon className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{item.title}</h3>
                <p className="text-white/50 text-sm mb-6 leading-relaxed">{item.desc}</p>
                <div className="pt-4 border-t border-white/5">
                  <div className="text-2xl font-bold text-red-400">{item.stat}</div>
                  <div className="text-xs text-white/40">{item.statLabel}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solucao" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#25D366]/5 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <Badge className="bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20 mb-6">
              <Zap className="w-3 h-3 mr-1" />
              A solução
            </Badge>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Seu WhatsApp.
              <span className="text-[#25D366]"> Organizado.</span>
            </h2>
            
            <p className="text-xl text-white/50">
              Não é mais um CRM complicado. É o mínimo necessário para você nunca mais perder uma venda.
            </p>
          </div>
          
          {/* AI Feature - Hero Highlight */}
          <Card className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border-purple-500/20 p-8 md:p-12 mb-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl" />
            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              <div>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 mb-6">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Exclusivo • Inteligência Artificial
                </Badge>
                <h3 className="text-3xl md:text-4xl font-bold mb-4">
                  IA que analisa suas conversas e te diz
                  <span className="text-purple-400"> o que fazer</span>
                </h3>
                <p className="text-white/60 text-lg mb-6">
                  Não sabe se o cliente vai fechar? Nossa IA lê a conversa e te dá um diagnóstico: 
                  probabilidade de venda, próximos passos sugeridos, e alerta de objeções.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Análise de sentimento do cliente',
                    'Sugestão do próximo passo ideal',
                    'Identificação automática de objeções',
                    'Score de probabilidade de fechamento'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-white/70">
                      <CheckCircle2 className="w-5 h-5 text-purple-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className="bg-purple-500 hover:bg-purple-600 text-white font-semibold h-12 px-6">
                    Testar a IA Grátis
                    <Sparkles className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="hidden md:block">
                <div className="rounded-xl bg-[#111] border border-white/10 p-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="font-medium">Análise da Conversa</div>
                      <div className="text-xs text-white/50">Maria Santos • Agora</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/60">Probabilidade de Venda</span>
                      <span className="text-lg font-bold text-[#25D366]">78%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10">
                      <div className="w-[78%] h-full rounded-full bg-gradient-to-r from-[#25D366] to-emerald-400" />
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="text-xs text-purple-300 font-medium mb-1">💡 Sugestão da IA</div>
                      <div className="text-sm text-white/80">Cliente interessado mas preocupado com preço. Ofereça parcelamento ou desconto à vista para fechar hoje.</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs">Objeção: Preço</div>
                      <div className="px-2 py-1 rounded bg-[#25D366]/20 text-[#25D366] text-xs">Interesse: Alto</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Feature 1 - Kanban */}
            <Card className="bg-white/[0.02] border-white/5 overflow-hidden group hover:border-[#25D366]/30 transition-colors">
              <div className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mb-6 group-hover:bg-[#25D366]/20 transition-colors">
                  <BarChart3 className="w-7 h-7 text-[#25D366]" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Veja seu funil de verdade</h3>
                <p className="text-white/50 mb-6">
                  Todos os seus leads em colunas. Arrasta, solta, fecha. Simples assim.
                </p>
                <ul className="space-y-3">
                  {['Novo → Negociando → Fechado em segundos', 'Valor do negócio visível em cada card', 'Filtros por tag, valor, data'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                      <CheckCircle2 className="w-4 h-4 text-[#25D366]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="h-48 bg-gradient-to-t from-[#25D366]/5 to-transparent border-t border-white/5 flex items-center justify-center">
                <div className="flex gap-2">
                  {['Novo', 'Contato', 'Negociando'].map((col, i) => (
                    <div key={col} className="w-24 h-32 rounded-lg bg-white/5 border border-white/10 p-2">
                      <div className="text-[10px] text-white/40 mb-2">{col}</div>
                      <div className="w-full h-8 rounded bg-white/10 mb-1" />
                      {i < 2 && <div className="w-full h-8 rounded bg-white/10" />}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            
            {/* Feature 2 - Reminders */}
            <Card className="bg-white/[0.02] border-white/5 overflow-hidden group hover:border-amber-500/30 transition-colors">
              <div className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
                  <Bell className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Nunca mais "me liga amanhã"</h3>
                <p className="text-white/50 mb-6">
                  Cliente pediu pra ligar depois? Um clique e você tem o lembrete. Nunca mais esquece.
                </p>
                <ul className="space-y-3">
                  {['Lembretes por push notification', 'Agenda do dia com todos os follow-ups', 'Histórico de quando cada cliente falou'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                      <CheckCircle2 className="w-4 h-4 text-amber-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="h-48 bg-gradient-to-t from-amber-500/5 to-transparent border-t border-white/5 flex items-center justify-center">
                <div className="w-64 rounded-lg bg-white/5 border border-white/10 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <div className="text-xs font-medium">Ligar pra Maria</div>
                      <div className="text-[10px] text-white/40">Em 30 minutos</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-7 rounded bg-[#25D366]/20 flex items-center justify-center text-[10px] text-[#25D366] font-medium">Ligar agora</div>
                    <div className="flex-1 h-7 rounded bg-white/10 flex items-center justify-center text-[10px] text-white/50">Adiar 1h</div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Feature 3 - Chat */}
            <Card className="bg-white/[0.02] border-white/5 overflow-hidden group hover:border-violet-500/30 transition-colors">
              <div className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-6 group-hover:bg-violet-500/20 transition-colors">
                  <MessageCircle className="w-7 h-7 text-violet-500" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Responda sem sair do sistema</h3>
                <p className="text-white/50 mb-6">
                  Chat integrado direto no dashboard. Vê a conversa, responde, anota, tudo no mesmo lugar.
                </p>
                <ul className="space-y-3">
                  {['Histórico completo de cada cliente', 'Notas e observações privadas', 'Um clique pra abrir no WhatsApp'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                      <CheckCircle2 className="w-4 h-4 text-violet-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="h-48 bg-gradient-to-t from-violet-500/5 to-transparent border-t border-white/5 flex items-center justify-center">
                <div className="w-64 rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                  <div className="p-2 border-b border-white/5 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20" />
                    <span className="text-xs font-medium">Maria Santos</span>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="bg-white/10 rounded-lg rounded-tl-none p-2 text-[10px] max-w-[80%]">Oi, quanto custa?</div>
                    <div className="bg-[#25D366]/20 rounded-lg rounded-tr-none p-2 text-[10px] max-w-[80%] ml-auto">R$ 497, mas até hoje tem 20% off!</div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Feature 4 - Metrics */}
            <Card className="bg-white/[0.02] border-white/5 overflow-hidden group hover:border-sky-500/30 transition-colors">
              <div className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-6 group-hover:bg-sky-500/20 transition-colors">
                  <TrendingUp className="w-7 h-7 text-sky-500" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Saiba quanto você vende</h3>
                <p className="text-white/50 mb-6">
                  Métricas simples que importam. Sem dashboard complicado de MBA. Só o essencial.
                </p>
                <ul className="space-y-3">
                  {['Receita do mês em destaque', 'Taxa de conversão real', 'Comparativo com mês anterior'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                      <CheckCircle2 className="w-4 h-4 text-sky-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="h-48 bg-gradient-to-t from-sky-500/5 to-transparent border-t border-white/5 flex items-center justify-center">
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-sky-400">R$ 8.2k</div>
                    <div className="text-[10px] text-white/40">Esse mês</div>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#25D366]">67%</div>
                    <div className="text-[10px] text-white/40">Conversão</div>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">23</div>
                    <div className="text-[10px] text-white/40">Vendas</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Configuração em 2 minutos
            </h2>
            <p className="text-white/50">Sem instalação. Sem complicação. Só funciona.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Crie sua conta', desc: 'Email e senha. 10 segundos.' },
              { step: '2', title: 'Escaneie o QR Code', desc: 'Igual WhatsApp Web. Suas conversas aparecem.' },
              { step: '3', title: 'Organize e venda', desc: 'Arraste leads, crie lembretes, feche mais.' }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-[#25D366]">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">{item.title}</h3>
                <p className="text-white/50 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="preco" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="bg-white/5 text-white/70 border-white/10 mb-6">Preço honesto</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Menos que uma pizza
            </h2>
            <p className="text-xl text-white/50">
              Se te ajudar a fechar UMA venda a mais por mês, já se pagou.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <Card className="bg-white/[0.02] border-white/10 p-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1">Grátis</h3>
                <p className="text-white/50 text-sm">Para testar e gostar</p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-bold">R$0</span>
                <span className="text-white/50">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Até 50 leads', 'Kanban básico', '5 lembretes por mês', 'Chat integrado'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                    <CheckCircle2 className="w-4 h-4 text-white/30" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/5 h-12">
                  Começar Grátis
                </Button>
              </Link>
            </Card>
            
            {/* Pro */}
            <Card className="bg-gradient-to-b from-[#25D366]/10 to-transparent border-[#25D366]/30 p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-[#25D366] text-black border-0 font-semibold">Mais popular</Badge>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1">Pro</h3>
                <p className="text-white/50 text-sm">Para quem vende de verdade</p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-bold">R$29</span>
                <span className="text-white/50">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Leads ilimitados', 'Lembretes ilimitados', 'Métricas e relatórios', 'Suporte prioritário via WhatsApp', 'Exportar dados'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                    <CheckCircle2 className="w-4 h-4 text-[#25D366]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button className="w-full bg-[#25D366] text-black hover:bg-[#20bd5a] h-12 font-semibold">
                  Testar 7 Dias Grátis
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <p className="text-center text-xs text-white/40 mt-4">
                Sem cartão de crédito. Cancela quando quiser.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">Perguntas frequentes</h2>
          
          <div className="space-y-4">
            {[
              {
                q: 'Como conecto meu WhatsApp?',
                a: 'Você escaneia um QR Code, igual ao WhatsApp Web. Leva 10 segundos e suas conversas aparecem automaticamente.'
              },
              {
                q: 'Funciona no celular?',
                a: 'Sim! Abre no navegador do celular e funciona perfeitamente. Não precisa baixar app.'
              },
              {
                q: 'Posso usar no WhatsApp Business?',
                a: 'Sim! Funciona tanto com WhatsApp normal quanto com WhatsApp Business.'
              },
              {
                q: 'Meus dados ficam seguros?',
                a: 'Sim. Usamos criptografia e seus dados nunca são compartilhados. Você pode deletar tudo a qualquer momento.'
              },
              {
                q: 'Posso cancelar quando quiser?',
                a: 'Sim, sem burocracia. Um clique e está cancelado. Sem taxa, sem pergunta.'
              }
            ].map((item, i) => (
              <Card key={i} className="bg-white/[0.02] border-white/5 p-6 hover:bg-white/[0.04] transition-colors">
                <h3 className="font-semibold mb-2 text-white">{item.q}</h3>
                <p className="text-white/50 text-sm">{item.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Quantas vendas você vai
            <span className="text-[#25D366]"> perder </span>
            essa semana?
          </h2>
          <p className="text-xl text-white/50 mb-10 max-w-2xl mx-auto">
            Cada dia sem organização é dinheiro que você deixa na mesa. Configure em 2 minutos e comece a recuperar.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-[#25D366] text-black hover:bg-[#20bd5a] font-semibold h-14 px-10 text-lg">
              Criar Conta Grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <p className="text-sm text-white/40 mt-6">
            Sem cartão de crédito • Configuração em 2 min • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="CRMzap" className="w-8 h-8 rounded-lg" />
              <span className="font-semibold">CRMzap</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/40">
              <Link href="/terms" className="hover:text-white transition-colors">Termos</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
            </div>
            <p className="text-sm text-white/40">
              © 2026 CRMzap. Feito com 💚 no Brasil.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
