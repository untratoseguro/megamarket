'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  name: string | null
  email: string
  role: string
}

export default function PerfilPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', user.id)
        .single()

      if (data) setProfile(data as Profile)
      setLoading(false)
    }

    loadProfile()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Cargando perfil…</div>
      </div>
    )
  }

  if (!user) return null

  const displayName = profile?.name ?? user.email?.split('@')[0] ?? 'Usuario'
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Mi perfil</h1>

      <div className="space-y-6">
        {/* Avatar + basic info */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-3xl font-bold text-indigo-700">{initials}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">{displayName}</h2>
            <p className="text-zinc-500 text-sm">{user.email}</p>
            <span className={`mt-2 inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              profile?.role === 'admin'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-zinc-100 text-zinc-600'
            }`}>
              {profile?.role === 'admin' ? '⚡ Administrador' : '👤 Cliente'}
            </span>
          </div>
        </div>

        {/* Account details */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wide mb-4">
            Información de cuenta
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-zinc-500">Nombre</dt>
              <dd className="text-zinc-900 font-medium">{profile?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between text-sm border-t border-zinc-100 pt-3">
              <dt className="text-zinc-500">Correo</dt>
              <dd className="text-zinc-900 font-medium">{user.email}</dd>
            </div>
            <div className="flex justify-between text-sm border-t border-zinc-100 pt-3">
              <dt className="text-zinc-500">Miembro desde</dt>
              <dd className="text-zinc-900 font-medium">
                {new Date(user.created_at).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
            <div className="flex justify-between text-sm border-t border-zinc-100 pt-3">
              <dt className="text-zinc-500">ID de usuario</dt>
              <dd className="font-mono text-xs text-zinc-400">{user.id}</dd>
            </div>
          </dl>
        </div>

        {/* Placeholder sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-zinc-200 border-dashed rounded-2xl p-6 text-center opacity-60">
            <p className="text-3xl mb-2">📦</p>
            <h3 className="text-sm font-semibold text-zinc-700 mb-1">Mis pedidos</h3>
            <p className="text-xs text-zinc-400">Disponible en Fase 4</p>
          </div>
          <div className="bg-white border border-zinc-200 border-dashed rounded-2xl p-6 text-center opacity-60">
            <p className="text-3xl mb-2">❤️</p>
            <h3 className="text-sm font-semibold text-zinc-700 mb-1">Favoritos</h3>
            <p className="text-xs text-zinc-400">Disponible en Fase 4</p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-3">
          <Link
            href="/catalogo"
            className="flex items-center justify-between text-sm text-zinc-700 hover:text-indigo-600 transition-colors py-1"
          >
            <span>Explorar catálogo</span>
            <span>→</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full mt-4 py-3 text-sm font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
