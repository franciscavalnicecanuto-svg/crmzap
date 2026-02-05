import { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircle, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Termos de Uso | CRMzap',
  description: 'Termos de uso do CRMzap - CRM para WhatsApp',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <img src="/logo.png" alt="CRMzap" className="w-9 h-9 rounded-lg" />
            <span className="font-semibold text-lg">CRMzap</span>
          </Link>
          <Link href="/" className="text-sm text-white/50 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">Termos de Uso</h1>
        <p className="text-white/50 mb-12">Última atualização: 5 de fevereiro de 2026</p>
        
        <div className="space-y-10 text-white/80">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e usar o CRMzap, você concorda em cumprir e estar vinculado a estes Termos de Uso. 
              Se você não concordar com qualquer parte destes termos, não poderá usar nosso serviço.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Descrição do Serviço</h2>
            <p>
              O CRMzap é uma plataforma de CRM (Customer Relationship Management) que permite aos usuários 
              organizar seus leads e conversas do WhatsApp em uma interface visual de kanban. O serviço inclui 
              recursos como lembretes de follow-up, análise de conversas com IA e métricas de vendas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Requisitos de Uso</h2>
            <p className="mb-4">Para usar o CRMzap, você deve:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>Ter pelo menos 18 anos de idade</li>
              <li>Possuir uma conta válida do WhatsApp</li>
              <li>Usar o serviço para fins comerciais legítimos</li>
              <li>Fornecer informações verdadeiras e precisas</li>
              <li>Manter a segurança da sua conta</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Uso Aceitável</h2>
            <p className="mb-4">Você concorda em NÃO usar o CRMzap para:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>Enviar spam ou mensagens não solicitadas em massa</li>
              <li>Assediar, ameaçar ou intimidar outras pessoas</li>
              <li>Violar direitos de propriedade intelectual</li>
              <li>Distribuir malware ou conteúdo malicioso</li>
              <li>Violar leis aplicáveis ou regulamentos</li>
              <li>Violar os Termos de Serviço do WhatsApp</li>
              <li>Coletar dados de usuários sem consentimento</li>
              <li>Revender ou redistribuir o serviço</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Sua Conta</h2>
            <p>
              Você é responsável por manter a confidencialidade da sua conta e por todas as atividades 
              que ocorram sob sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.
              O CRMzap usa autenticação via Google para maior segurança.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Planos e Pagamentos</h2>
            <p className="mb-4">O CRMzap oferece:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li><strong className="text-white">Plano Grátis:</strong> Funcionalidades básicas com limite de leads</li>
              <li><strong className="text-white">Plano Pro:</strong> Funcionalidades completas por R$29/mês</li>
            </ul>
            <p className="mt-4">
              O plano Pro oferece 7 dias de teste grátis. Você pode cancelar a qualquer momento.
              Pagamentos são processados de forma segura através de processadores terceirizados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Propriedade Intelectual</h2>
            <p>
              O CRMzap e todo seu conteúdo, recursos e funcionalidades são de propriedade exclusiva nossa 
              e estão protegidos por leis de direitos autorais e outras leis de propriedade intelectual.
              Você não pode copiar, modificar ou distribuir o software sem autorização.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Isenção de Garantias</h2>
            <p>
              O serviço é fornecido &quot;como está&quot; e &quot;conforme disponível&quot;. Não garantimos que o serviço 
              será ininterrupto, seguro ou livre de erros. Não nos responsabilizamos por ações do WhatsApp 
              que possam afetar o funcionamento do serviço. O CRMzap não é afiliado ao WhatsApp Inc.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Limitação de Responsabilidade</h2>
            <p>
              Em nenhuma circunstância seremos responsáveis por danos indiretos, incidentais, especiais 
              ou consequenciais, incluindo perda de lucros, dados ou uso, decorrentes do uso ou 
              incapacidade de usar o serviço. Nossa responsabilidade máxima é limitada ao valor pago 
              pelo serviço nos últimos 12 meses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Rescisão</h2>
            <p>
              Podemos suspender ou encerrar seu acesso ao serviço a qualquer momento, sem aviso prévio, 
              por violação destes termos ou por qualquer outro motivo. Você pode encerrar sua conta a 
              qualquer momento nas configurações. Após o encerramento, seus dados serão excluídos conforme 
              nossa política de privacidade.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Alterações nos Termos</h2>
            <p>
              Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações 
              significativas serão notificadas por email ou através do aplicativo. O uso continuado 
              após alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Lei Aplicável</h2>
            <p>
              Estes termos são regidos pelas leis do Brasil. Qualquer disputa será resolvida nos 
              tribunais competentes do Brasil, no foro da comarca de Fortaleza-CE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Contato</h2>
            <p className="mb-4">Para dúvidas sobre estes termos, entre em contato:</p>
            <ul className="space-y-2 text-white/70">
              <li><strong className="text-white">Email:</strong> suporte@whatszap.com.br</li>
              <li><strong className="text-white">Site:</strong> whatszap.com.br</li>
            </ul>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between">
          <Link href="/" className="text-[#25D366] hover:underline flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o início
          </Link>
          <Link href="/privacy" className="text-white/50 hover:text-white">
            ← Política de Privacidade
          </Link>
        </div>
      </div>
    </div>
  )
}
