import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'

// Server component: verifica role='admin'.
// notFound() muestra 404 → no revela que la ruta existe.
async function verifyAdmin() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll() {},
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') notFound()
}

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '◈' },
  { href: '/admin/categorias', label: 'Categorías', icon: '◻' },
  { href: '/admin/productos', label: 'Productos', icon: '◼' },
  { href: '/admin/inventario', label: 'Inventario', icon: '◧' },
  { href: '/admin/ordenes', label: 'Órdenes', icon: '◨' },
  { href: '/admin/cupones', label: 'Cupones', icon: '◉' },
  { href: '/admin/imports', label: 'Imports', icon: '◈' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await verifyAdmin()

  return (
    <div className="min-h-screen flex bg-zinc-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-zinc-900 text-zinc-300 flex flex-col">
        <div className="px-5 py-5 border-b border-zinc-800">
          <Link href="/admin" className="flex items-center gap-1.5">
            <span className="text-indigo-400 font-extrabold text-lg">Mega</span>
            <span className="text-white font-extrabold text-lg">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <span className="text-indigo-400 text-xs">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-zinc-800">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Volver a la tienda
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
