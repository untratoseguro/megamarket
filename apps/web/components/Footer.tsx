import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-zinc-900 text-zinc-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-1 mb-3">
            <span className="text-indigo-400 font-extrabold text-lg">Mega</span>
            <span className="text-white font-extrabold text-lg">Market</span>
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Tu marketplace de confianza con miles de productos en todas las categorías.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wide">Explorar</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/catalogo" className="hover:text-white transition-colors">Catálogo</Link></li>
            <li><Link href="/catalogo?is_featured=true" className="hover:text-white transition-colors">Destacados</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wide">Mi cuenta</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link></li>
            <li><Link href="/registro" className="hover:text-white transition-colors">Registrarse</Link></li>
            <li><Link href="/perfil" className="hover:text-white transition-colors">Mi perfil</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} MegaMarket. Todos los derechos reservados.
      </div>
    </footer>
  )
}
