'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  MessageCircle, 
  CheckCircle2,
  Loader2,
  RefreshCw,
  Smartphone,
  Wifi,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

type ConnectionState = 'idle' | 'loading' | 'waiting_scan' | 'connecting' | 'connected' | 'error'

export default function ConnectPage() {
  const [state, setState] = useState<ConnectionState>('idle')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(60)

  // Check connection status
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status')
      const data = await res.json()
      
      if (data.connected || data.state === 'open') {
        setState('connected')
        return true
      }
      return false
    } catch (err) {
      console.error('Status check error:', err)
      return false
    }
  }, [])

  // Generate QR Code
  const generateQRCode = useCallback(async () => {
    setState('loading')
    setError(null)
    setCountdown(60)
    
    try {
      // First check if already connected
      const isConnected = await checkStatus()
      if (isConnected) return

      // Generate new QR code
      const res = await fetch('/api/whatsapp/qrcode')
      const data = await res.json()
      
      if (data.error) {
        setError(data.error)
        setState('error')
        return
      }
      
      if (data.qrcode) {
        setQrCode(data.qrcode)
        setState('waiting_scan')
      } else {
        setError('QR Code não disponível. Tente novamente.')
        setState('error')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar QR Code')
      setState('error')
    }
  }, [checkStatus])

  // Poll for connection status while waiting for scan
  useEffect(() => {
    if (state !== 'waiting_scan') return

    const interval = setInterval(async () => {
      const isConnected = await checkStatus()
      if (isConnected) {
        clearInterval(interval)
      }
    }, 3000) // Check every 3 seconds

    return () => clearInterval(interval)
  }, [state, checkStatus])

  // Countdown for QR code expiration
  useEffect(() => {
    if (state !== 'waiting_scan') return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // QR code expired, generate new one
          generateQRCode()
          return 60
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [state, generateQRCode])

  // Check status on mount
  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">CRMZap</span>
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md">
            {/* Connected State */}
            {state === 'connected' && (
              <Card className="p-8 text-center border-green-200 dark:border-green-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold mb-2 text-green-700 dark:text-green-400">
                  WhatsApp Conectado!
                </h1>
                <p className="text-muted-foreground mb-6">
                  Seu WhatsApp está pronto para receber e enviar mensagens.
                </p>
                <Link href="/dashboard">
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25">
                    Ir para o Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </Card>
            )}

            {/* Idle State - Start Connection */}
            {state === 'idle' && (
              <Card className="p-8 text-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Conectar WhatsApp</h1>
                <p className="text-muted-foreground mb-6">
                  Conecte seu WhatsApp para centralizar todas as conversas com seus clientes.
                </p>
                <Button 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25"
                  onClick={generateQRCode}
                >
                  <Wifi className="w-4 h-4 mr-2" />
                  Iniciar Conexão
                </Button>
              </Card>
            )}

            {/* Loading State */}
            {state === 'loading' && (
              <Card className="p-8 text-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400/50 to-emerald-500/50 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Gerando QR Code...</h1>
                <p className="text-muted-foreground">
                  Aguarde um momento
                </p>
              </Card>
            )}

            {/* QR Code Display */}
            {state === 'waiting_scan' && qrCode && (
              <Card className="p-6 sm:p-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold mb-2">Escaneie o QR Code</h1>
                  <p className="text-muted-foreground text-sm">
                    Abra o WhatsApp no seu celular e escaneie
                  </p>
                </div>

                {/* QR Code */}
                <div className="relative mx-auto w-fit">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl blur-xl opacity-30" />
                  <div className="relative bg-white p-4 rounded-2xl shadow-lg">
                    <Image
                      src={qrCode}
                      alt="QR Code para conectar WhatsApp"
                      width={240}
                      height={240}
                      className="rounded-lg"
                      priority
                    />
                  </div>
                </div>

                {/* Countdown */}
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                    <RefreshCw className="w-3 h-3" />
                    <span>Atualiza em {countdown}s</span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 dark:text-green-400 font-medium text-xs">1</span>
                    </div>
                    <p className="text-muted-foreground">
                      Abra o <strong className="text-foreground">WhatsApp</strong> no seu celular
                    </p>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 dark:text-green-400 font-medium text-xs">2</span>
                    </div>
                    <p className="text-muted-foreground">
                      Toque em <strong className="text-foreground">⋮ Menu</strong> → <strong className="text-foreground">Dispositivos conectados</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 dark:text-green-400 font-medium text-xs">3</span>
                    </div>
                    <p className="text-muted-foreground">
                      Toque em <strong className="text-foreground">Conectar dispositivo</strong> e escaneie o código
                    </p>
                  </div>
                </div>

                {/* Refresh button */}
                <Button 
                  variant="outline" 
                  className="w-full mt-6"
                  onClick={generateQRCode}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Gerar novo QR Code
                </Button>
              </Card>
            )}

            {/* Error State */}
            {state === 'error' && (
              <Card className="p-8 text-center border-red-200 dark:border-red-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl">
                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">😕</span>
                </div>
                <h1 className="text-2xl font-bold mb-2 text-red-700 dark:text-red-400">
                  Algo deu errado
                </h1>
                <p className="text-muted-foreground mb-6">
                  {error || 'Não foi possível gerar o QR Code. Tente novamente.'}
                </p>
                <Button 
                  className="w-full"
                  onClick={generateQRCode}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
              </Card>
            )}

            {/* Footer info */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                Conexão segura e criptografada
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
