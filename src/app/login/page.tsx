'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { MessageCircle, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { signInWithProvider, signInWithEmail, getSession, AuthProvider } from '@/lib/supabase-client'

// Social provider icons
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
)

const FacebookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<AuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null) // Bug #152: Email validation
  const [passwordError, setPasswordError] = useState<string | null>(null) // Bug #152: Password validation
  const [touched, setTouched] = useState({ email: false, password: false }) // Track touched fields
  
  // Bug #152: Email validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  // Bug #152: Validate fields on blur
  const validateEmail = () => {
    setTouched(prev => ({ ...prev, email: true }))
    if (!email) {
      setEmailError('Email é obrigatório')
    } else if (!isValidEmail(email)) {
      setEmailError('Email inválido')
    } else {
      setEmailError(null)
    }
  }
  
  const validatePassword = () => {
    setTouched(prev => ({ ...prev, password: true }))
    if (!password) {
      setPasswordError('Senha é obrigatória')
    } else if (password.length < 6) {
      setPasswordError('Senha deve ter pelo menos 6 caracteres')
    } else {
      setPasswordError(null)
    }
  }

  // Check if already logged in
  useEffect(() => {
    getSession().then(({ session }) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [router])

  const handleSocialLogin = async (provider: AuthProvider) => {
    setSocialLoading(provider)
    setError(null)
    
    const { error } = await signInWithProvider(provider)
    
    if (error) {
      setError(error.message)
      setSocialLoading(null)
    }
    // Redirect happens automatically via OAuth
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Bug #152: Validate before submitting
    validateEmail()
    validatePassword()
    
    if (!isValidEmail(email)) {
      setEmailError('Email inválido')
      return
    }
    if (password.length < 6) {
      setPasswordError('Senha deve ter pelo menos 6 caracteres')
      return
    }
    
    setIsLoading(true)
    setError(null)

    const { data, error } = await signInWithEmail(email, password)

    if (error) {
      // Bug #152: Better error messages in Portuguese
      let errorMessage = error.message
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Confirme seu email antes de entrar'
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Muitas tentativas. Aguarde um momento.'
      }
      setError(errorMessage)
      setIsLoading(false)
      
      // Haptic feedback on error
      if ('vibrate' in navigator) navigator.vibrate([50, 30, 50])
      return
    }

    if (data?.session) {
      // Haptic feedback on success
      if ('vibrate' in navigator) navigator.vibrate([10, 50, 10])
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="CRMzap" className="w-12 h-12 rounded-xl" />
          </div>
          <CardTitle className="text-2xl font-bold">Bem-vindo de volta!</CardTitle>
          <CardDescription>
            Entre na sua conta para continuar
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Social Login Buttons */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full h-11 font-medium"
              onClick={() => handleSocialLogin('google')}
              disabled={socialLoading !== null}
            >
              {socialLoading === 'google' ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              <span className="ml-2">Continuar com Google</span>
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                  touched.email && emailError ? 'text-red-500' : 'text-muted-foreground'
                }`} />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className={`pl-9 transition-colors ${
                    touched.email && emailError ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (touched.email) setEmailError(null) // Clear error on type
                  }}
                  onBlur={validateEmail}
                  required
                  autoComplete="email"
                  aria-invalid={touched.email && !!emailError}
                  aria-describedby={emailError ? 'email-error' : undefined}
                />
              </div>
              {touched.email && emailError && (
                <p id="email-error" className="text-xs text-red-500 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  {emailError}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-green-600 hover:text-green-700"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                  touched.password && passwordError ? 'text-red-500' : 'text-muted-foreground'
                }`} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`pl-9 pr-9 transition-colors ${
                    touched.password && passwordError ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (touched.password) setPasswordError(null) // Clear error on type
                  }}
                  onBlur={validatePassword}
                  required
                  autoComplete="current-password"
                  aria-invalid={touched.password && !!passwordError}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && passwordError && (
                <p id="password-error" className="text-xs text-red-500 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  {passwordError}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 bg-green-500 hover:bg-green-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/signup" className="text-green-600 hover:text-green-700 font-medium">
              Cadastre-se grátis
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
