import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termos de Uso | CRMZap',
  description: 'Termos de uso do CRMZap - Gerenciamento de mensagens para Facebook e Instagram',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Termos de Uso</h1>
        <p className="text-slate-400 mb-8">Última atualização: 3 de fevereiro de 2026</p>
        
        <div className="prose prose-invert prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">1. Aceitação dos Termos</h2>
            <p className="text-slate-300 mb-4">
              Ao acessar e usar o CRMZap, você concorda em cumprir e estar vinculado a estes Termos de Uso. 
              Se você não concordar com qualquer parte destes termos, não poderá usar nosso serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">2. Descrição do Serviço</h2>
            <p className="text-slate-300 mb-4">
              O CRMZap é uma plataforma de gerenciamento de mensagens que permite aos usuários gerenciar 
              conversas do Facebook Messenger e Instagram Direct em uma única interface. O serviço requer 
              integração com sua conta Meta (Facebook/Instagram).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. Requisitos de Uso</h2>
            <p className="text-slate-300 mb-4">Para usar o CRMZap, você deve:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
              <li>Ter pelo menos 18 anos de idade</li>
              <li>Possuir uma conta válida no Facebook</li>
              <li>Ser administrador de pelo menos uma Página do Facebook</li>
              <li>Concordar com os Termos de Serviço da Meta</li>
              <li>Fornecer informações verdadeiras e precisas</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Uso Aceitável</h2>
            <p className="text-slate-300 mb-4">Você concorda em NÃO usar o CRMZap para:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
              <li>Enviar spam ou mensagens não solicitadas em massa</li>
              <li>Assediar, ameaçar ou intimidar outras pessoas</li>
              <li>Violar direitos de propriedade intelectual</li>
              <li>Distribuir malware ou conteúdo malicioso</li>
              <li>Violar leis aplicáveis ou regulamentos</li>
              <li>Violar as políticas da Meta/Facebook/Instagram</li>
              <li>Coletar dados de usuários sem consentimento</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Sua Conta</h2>
            <p className="text-slate-300 mb-4">
              Você é responsável por manter a confidencialidade da sua conta e por todas as atividades 
              que ocorram sob sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Propriedade Intelectual</h2>
            <p className="text-slate-300 mb-4">
              O CRMZap e todo seu conteúdo, recursos e funcionalidades são de propriedade exclusiva nossa 
              e estão protegidos por leis de direitos autorais e outras leis de propriedade intelectual.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Isenção de Garantias</h2>
            <p className="text-slate-300 mb-4">
              O serviço é fornecido &quot;como está&quot; e &quot;conforme disponível&quot;. Não garantimos que o serviço 
              será ininterrupto, seguro ou livre de erros. Não nos responsabilizamos por ações da Meta 
              que possam afetar o funcionamento do serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">8. Limitação de Responsabilidade</h2>
            <p className="text-slate-300 mb-4">
              Em nenhuma circunstância seremos responsáveis por danos indiretos, incidentais, especiais 
              ou consequenciais, incluindo perda de lucros, dados ou uso, decorrentes do uso ou 
              incapacidade de usar o serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Rescisão</h2>
            <p className="text-slate-300 mb-4">
              Podemos suspender ou encerrar seu acesso ao serviço a qualquer momento, sem aviso prévio, 
              por violação destes termos ou por qualquer outro motivo. Você pode encerrar sua conta a 
              qualquer momento nas configurações.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">10. Alterações nos Termos</h2>
            <p className="text-slate-300 mb-4">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações 
              significativas serão notificadas por email ou através do aplicativo. O uso continuado 
              após alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">11. Lei Aplicável</h2>
            <p className="text-slate-300 mb-4">
              Estes termos são regidos pelas leis do Brasil. Qualquer disputa será resolvida nos 
              tribunais competentes do Brasil.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">12. Contato</h2>
            <p className="text-slate-300 mb-4">
              Para dúvidas sobre estes termos, entre em contato:
            </p>
            <ul className="list-none text-slate-300 space-y-2">
              <li><strong>Email:</strong> suporte@crmzap.com.br</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <a href="/" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            ← Voltar para o início
          </a>
        </div>
      </div>
    </div>
  )
}
