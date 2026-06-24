'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegistroPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // If user is immediately confirmed (email confirmations disabled), create profile and redirect
      if (data.user && data.session) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name,
          email: data.user.email,
        })
        router.push('/perfil')
        router.refresh()
        return
      }

      // Email confirmation required
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center bg-white rounded-2xl border border-zinc-200 shadow-sm p-10">
          <p className="text-5xl mb-4">📧</p>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Revisa tu correo</h2>
          <p className="text-zinc-500 text-sm">
            Te enviamos un enlace de confirmación a{' '}
            <strong className="text-zinc-800">{email}</strong>.
            Ábrelo para activar tu cuenta.
          </p>
          <Link href="/login" className="mt-6 inline-block text-indigo-600 font-semibold hover:text-indigo-800 text-sm">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-1 mb-6">
              <span className="text-indigo-600 text-xl font-extrabold">Mega</span>
              <span className="text-zinc-800 text-xl font-extrabold">Market</span>
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900">Crear cuenta</h1>
            <p className="text-zinc-500 text-sm mt-1">Únete a MegaMarket hoy</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">
                Nombre completo
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-zinc-50"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-zinc-50"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-zinc-50"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>

            <p className="text-center text-xs text-zinc-400">
              Al registrarte aceptas nuestros términos y condiciones.
            </p>
          </form>

          <p className="text-center text-sm text-zinc-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-indigo-600 font-semibold hover:text-indigo-800">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
