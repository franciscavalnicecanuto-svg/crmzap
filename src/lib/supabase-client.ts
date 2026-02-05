import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create client only if we have credentials (avoids build-time errors)
let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase && supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  if (!supabase) {
    throw new Error('Supabase client not initialized - missing env vars')
  }
  return supabase
}

export type AuthProvider = 'google' | 'apple' | 'facebook'

export async function signInWithProvider(provider: AuthProvider) {
  try {
    // Use production URL for OAuth redirect (required by Google OAuth)
    const redirectTo = process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      : `${window.location.origin}/auth/callback`
    
    const { data, error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    })
    return { data, error }
  } catch (e: any) {
    return { data: null, error: { message: e.message } }
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  } catch (e: any) {
    return { data: null, error: { message: e.message } }
  }
}

export async function signUpWithEmail(email: string, password: string, name?: string) {
  try {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })
    return { data, error }
  } catch (e: any) {
    return { data: null, error: { message: e.message } }
  }
}

export async function signOut() {
  try {
    const { error } = await getSupabase().auth.signOut()
    return { error }
  } catch (e: any) {
    return { error: { message: e.message } }
  }
}

export async function getSession() {
  try {
    const { data: { session }, error } = await getSupabase().auth.getSession()
    return { session, error }
  } catch (e: any) {
    return { session: null, error: { message: e.message } }
  }
}

export async function getUser() {
  try {
    const { data: { user }, error } = await getSupabase().auth.getUser()
    return { user, error }
  } catch (e: any) {
    return { user: null, error: { message: e.message } }
  }
}

export async function resetPassword(email: string) {
  try {
    const redirectTo = process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
      : `${window.location.origin}/reset-password`
    
    const { data, error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo,
    })
    return { data, error }
  } catch (e: any) {
    return { data: null, error: { message: e.message } }
  }
}

export async function updatePassword(newPassword: string) {
  try {
    const { data, error } = await getSupabase().auth.updateUser({
      password: newPassword,
    })
    return { data, error }
  } catch (e: any) {
    return { data: null, error: { message: e.message } }
  }
}
