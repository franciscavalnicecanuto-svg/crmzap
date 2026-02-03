import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade | CRMZap',
  description: 'Política de privacidade do CRMZap - Gerenciamento de mensagens para Facebook e Instagram',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Política de Privacidade</h1>
        <p className="text-slate-400 mb-8">Última atualização: 3 de fevereiro de 2026</p>
        
        <div className="prose prose-invert prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introdução</h2>
            <p className="text-slate-300 mb-4">
              O CRMZap (&quot;nós&quot;, &quot;nosso&quot; ou &quot;aplicativo&quot;) respeita sua privacidade e está comprometido 
              em proteger seus dados pessoais. Esta política de privacidade explica como coletamos, usamos e 
              protegemos suas informações quando você usa nosso serviço de gerenciamento de mensagens para 
              Facebook e Instagram.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">2. Dados que Coletamos</h2>
            <p className="text-slate-300 mb-4">Quando você conecta sua conta do Facebook/Instagram ao CRMZap, coletamos:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
              <li>Informações básicas do seu perfil público (nome, foto)</li>
              <li>Lista de Páginas do Facebook que você administra</li>
              <li>Tokens de acesso para enviar e receber mensagens em seu nome</li>
              <li>Mensagens recebidas e enviadas através das suas Páginas</li>
              <li>Informações de contato dos seus clientes (quando disponíveis)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. Como Usamos seus Dados</h2>
            <p className="text-slate-300 mb-4">Utilizamos seus dados exclusivamente para:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
              <li>Permitir que você gerencie mensagens do Facebook Messenger e Instagram Direct</li>
              <li>Exibir conversas e histórico de mensagens no painel do CRMZap</li>
              <li>Enviar mensagens em nome das suas Páginas quando solicitado por você</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Compartilhamento de Dados</h2>
            <p className="text-slate-300 mb-4">
              <strong>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros</strong> para 
              fins de marketing. Seus dados podem ser compartilhados apenas:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
              <li>Com a Meta (Facebook/Instagram) para autenticação e funcionalidade de mensagens</li>
              <li>Com provedores de infraestrutura (hospedagem) sob contratos de confidencialidade</li>
              <li>Quando exigido por lei ou ordem judicial</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Segurança dos Dados</h2>
            <p className="text-slate-300 mb-4">
              Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
              <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
              <li>Armazenamento seguro de tokens de acesso</li>
              <li>Acesso restrito a dados apenas para pessoal autorizado</li>
              <li>Monitoramento contínuo de segurança</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Retenção de Dados</h2>
            <p className="text-slate-300 mb-4">
              Mantemos seus dados enquanto sua conta estiver ativa. Você pode solicitar a exclusão dos seus 
              dados a qualquer momento. Após a exclusão da conta, seus dados serão removidos em até 30 dias, 
              exceto quando a retenção for necessária por obrigações legais.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Seus Direitos</h2>
            <p className="text-slate-300 mb-4">Você tem direito a:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incorretos</li>
              <li>Solicitar exclusão dos seus dados</li>
              <li>Revogar o acesso do CRMZap às suas contas Meta</li>
              <li>Exportar seus dados em formato legível</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">8. Exclusão de Dados</h2>
            <p className="text-slate-300 mb-4">
              Para solicitar a exclusão dos seus dados, você pode:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
              <li>Acessar as configurações da sua conta e clicar em &quot;Excluir minha conta&quot;</li>
              <li>Remover o CRMZap das configurações de apps do Facebook</li>
              <li>Enviar um email para: suporte@crmzap.com.br</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Alterações nesta Política</h2>
            <p className="text-slate-300 mb-4">
              Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas 
              através do email cadastrado ou aviso no aplicativo. Recomendamos revisar esta página regularmente.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">10. Contato</h2>
            <p className="text-slate-300 mb-4">
              Para dúvidas sobre esta política de privacidade ou sobre seus dados, entre em contato:
            </p>
            <ul className="list-none text-slate-300 space-y-2">
              <li><strong>Email:</strong> suporte@crmzap.com.br</li>
              <li><strong>Aplicativo:</strong> CRMZap</li>
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
