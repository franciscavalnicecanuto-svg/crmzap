import { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircle, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidade | CRMzap',
  description: 'Política de privacidade do CRMzap - CRM para WhatsApp',
}

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold mb-4">Política de Privacidade</h1>
        <p className="text-white/50 mb-12">Última atualização: 5 de fevereiro de 2026</p>
        
        <div className="space-y-10 text-white/80">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introdução</h2>
            <p className="leading-relaxed">
              O CRMzap (&quot;nós&quot;, &quot;nosso&quot; ou &quot;aplicativo&quot;) respeita sua privacidade e está comprometido 
              em proteger seus dados pessoais. Esta política de privacidade explica como coletamos, usamos e 
              protegemos suas informações quando você usa nosso serviço de CRM para WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Dados que Coletamos</h2>
            <p className="mb-4">Quando você usa o CRMzap, coletamos:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>Informações da sua conta Google (nome, email, foto de perfil) quando você faz login</li>
              <li>Mensagens do WhatsApp quando você conecta seu dispositivo</li>
              <li>Informações de contato dos seus leads (nome, telefone)</li>
              <li>Notas e tags que você adiciona aos leads</li>
              <li>Dados de uso do aplicativo para melhorias</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Como Usamos seus Dados</h2>
            <p className="mb-4">Utilizamos seus dados exclusivamente para:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>Permitir que você gerencie seus leads e conversas do WhatsApp</li>
              <li>Exibir seu pipeline de vendas e métricas</li>
              <li>Criar lembretes de follow-up</li>
              <li>Fornecer análises de IA sobre suas conversas</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Compartilhamento de Dados</h2>
            <p className="mb-4">
              <strong className="text-white">Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros</strong> para 
              fins de marketing. Seus dados podem ser compartilhados apenas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>Com o Google para autenticação (login com Google)</li>
              <li>Com provedores de IA para análise de conversas (dados anonimizados)</li>
              <li>Com provedores de infraestrutura (hospedagem) sob contratos de confidencialidade</li>
              <li>Quando exigido por lei ou ordem judicial</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Segurança dos Dados</h2>
            <p className="mb-4">
              Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
              <li>Armazenamento seguro em servidores confiáveis</li>
              <li>Acesso restrito a dados apenas para pessoal autorizado</li>
              <li>Monitoramento contínuo de segurança</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Retenção de Dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Você pode solicitar a exclusão dos seus 
              dados a qualquer momento. Após a exclusão da conta, seus dados serão removidos em até 30 dias, 
              exceto quando a retenção for necessária por obrigações legais.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Seus Direitos</h2>
            <p className="mb-4">Você tem direito a:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incorretos</li>
              <li>Solicitar exclusão dos seus dados</li>
              <li>Revogar o acesso do CRMzap ao seu WhatsApp</li>
              <li>Exportar seus dados em formato legível</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Exclusão de Dados</h2>
            <p className="mb-4">Para solicitar a exclusão dos seus dados, você pode:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>Acessar as configurações da sua conta e clicar em &quot;Excluir minha conta&quot;</li>
              <li>Desconectar seu WhatsApp nas configurações</li>
              <li>Enviar um email para: suporte@whatszap.com.br</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para manter sua sessão ativa e preferências. 
              Não utilizamos cookies de rastreamento de terceiros para publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas 
              através do email cadastrado ou aviso no aplicativo. Recomendamos revisar esta página regularmente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Contato</h2>
            <p className="mb-4">
              Para dúvidas sobre esta política de privacidade ou sobre seus dados, entre em contato:
            </p>
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
          <Link href="/terms" className="text-white/50 hover:text-white">
            Termos de Uso →
          </Link>
        </div>
      </div>
    </div>
  )
}
