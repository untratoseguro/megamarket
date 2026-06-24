'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-zinc-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link href="/" className="flex-shrink-0 flex items-center gap-1.5">
          <span className="text-indigo-600 text-xl font-extrabold tracking-tight">Mega</span>
          <span className="text-zinc-800 text-xl font-extrabold tracking-tight">Market</span>
        </Link>

        <form action="/catalogo" method="GET" className="flex-1 max-w-xl">
          <div className="relative">
            <input
              name="q"
              type="search"
              placeholder="Buscar productos, marcas y más…"
              defaultValue=""
              className="w-full pl-4 pr-10 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-zinc-50"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-indigo-600 transition-colors"
              aria-label="Buscar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>

        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link
            href="/catalogo"
            className={`hidden sm:block transition-colors ${pathname?.startsWith('/catalogo') ? 'text-indigo-600' : 'text-zinc-600 hover:text-indigo-600'}`}
          >
            Catálogo
          </Link>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-2 text-zinc-700 hover:text-indigo-600 transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm">
                  {user.email?.[0]?.toUpperCase() ?? 'U'}
                </span>
                <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-zinc-100 py-1 z-50">
                  <div className="px-4 py-2 text-xs text-zinc-400 truncate border-b border-zinc-100 mb-1">
                    {user.email}
                  </div>
                  <Link
                    href="/perfil"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    Mi perfil
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-zinc-600 hover:text-indigo-600 transition-colors hidden sm:block">
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                Registrarse
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
