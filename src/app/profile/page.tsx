'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, User, Mail, Phone, Save, Loader2 } from 'lucide-react'
import { getUser, signOut } from '@/lib/supabase-client'
import { SettingsNav } from '@/components/settings-nav'

interface UserProfile {
  id: string
  email: string
  name: string
  phone?: string
  avatarUrl?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false) // Bug fix #79: Custom modal
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const { user: authUser, error } = await getUser()
        if (error || !authUser) {
          router.push('/login')
          return
        }
        const profile: UserProfile = {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
          phone: authUser.user_metadata?.phone || '',
          avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture
        }
        setUser(profile)
        setName(profile.name)
        setPhone(profile.phone || '')
      } catch (e) {
        console.error('Failed to load user:', e)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }
    loadUser()
  }, [router])

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      // Save to localStorage for now (would be Supabase in production)
      const updatedProfile = { ...user, name, phone }
      localStorage.setItem('whatszap-profile', JSON.stringify(updatedProfile))
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' })
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao salvar perfil.' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="font-semibold">Meu Perfil</h1>
        </div>
      </header>

      <SettingsNav />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="text-2xl bg-green-100 text-green-700">
                  {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{user?.name || 'Usuário'}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`pl-10 ${!name.trim() ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                  placeholder="Seu nome"
                />
              </div>
              {/* UX #627: Show hint when name is empty */}
              {!name.trim() && (
                <p className="text-xs text-red-500">
                  O nome é obrigatório
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado pois está vinculado à sua conta Google.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="phone"
                  value={phone}
                  onChange={(e) => {
                    // UX #705: Auto-format phone number as user types
                    let value = e.target.value.replace(/\D/g, '') // Remove non-digits
                    if (value.length > 11) value = value.slice(0, 11) // Max 11 digits
                    
                    // Format: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
                    if (value.length > 0) {
                      if (value.length <= 2) {
                        value = `(${value}`
                      } else if (value.length <= 7) {
                        value = `(${value.slice(0, 2)}) ${value.slice(2)}`
                      } else {
                        const hasNinthDigit = value.length > 10
                        value = `(${value.slice(0, 2)}) ${value.slice(2, hasNinthDigit ? 7 : 6)}-${value.slice(hasNinthDigit ? 7 : 6)}`
                      }
                    }
                    setPhone(value)
                  }}
                  className="pl-10"
                  placeholder="(00) 00000-0000"
                  maxLength={16}
                />
              </div>
              {/* UX #705: Show hint about format */}
              {phone && phone.replace(/\D/g, '').length > 0 && phone.replace(/\D/g, '').length < 10 && (
                <p className="text-xs text-amber-600">
                  Digite o número completo com DDD
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link href="/dashboard">
                <Button variant="outline">Cancelar</Button>
              </Link>
              {/* Bug fix #626: Disable save if name is empty or phone is incomplete */}
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !name.trim() || (phone.replace(/\D/g, '').length > 0 && phone.replace(/\D/g, '').length < 10)}
                title={
                  !name.trim() 
                    ? 'Preencha o nome' 
                    : (phone.replace(/\D/g, '').length > 0 && phone.replace(/\D/g, '').length < 10)
                      ? 'Complete o número de telefone'
                      : 'Salvar perfil'
                }
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="mt-6 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Zona de Perigo</CardTitle>
            <CardDescription>Ações irreversíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              Excluir minha conta
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Bug fix #79: Modal de confirmação customizado (substituir confirm() nativo) */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0 duration-200"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-background rounded-lg p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <User className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold">Excluir Conta</h3>
                <p className="text-sm text-muted-foreground">Esta ação é irreversível</p>
              </div>
            </div>
            <p className="text-sm mb-4 text-muted-foreground">
              Tem certeza que deseja excluir sua conta? Todos os seus dados serão permanentemente removidos e você será desconectado.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={async () => {
                  setIsDeleting(true)
                  try {
                    // Would delete account data from Supabase in production
                    localStorage.removeItem('whatszap-leads-v3')
                    localStorage.removeItem('whatszap-profile')
                    localStorage.removeItem('whatszap-settings')
                    await signOut()
                    router.push('/')
                  } catch (e) {
                    console.error('Failed to delete account:', e)
                    setIsDeleting(false)
                    setShowDeleteConfirm(false)
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir Conta'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
