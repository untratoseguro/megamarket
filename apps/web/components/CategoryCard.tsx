import Link from 'next/link'
import { placeholderColor } from '@/lib/utils'
import type { CategoryNode } from '@/types'

const DEFAULT_ICONS: Record<string, string> = {
  electronica: '📱',
  computadores: '💻',
  audio: '🎧',
  hogar: '🏠',
  muebles: '🛋️',
  cocina: '🍳',
  deportes: '⚽',
  ciclismo: '🚴',
  camping: '⛺',
  ropa: '👕',
  calzado: '👟',
  accesorios: '👜',
  libros: '📚',
  juguetes: '🧸',
  mascotas: '🐾',
  belleza: '💄',
  salud: '💊',
  automovil: '🚗',
}

function getIcon(category: CategoryNode): string {
  if (category.icon) return category.icon
  const key = category.slug.split('-')[0]
  return DEFAULT_ICONS[key] ?? '🛍️'
}

export default function CategoryCard({ category }: { category: CategoryNode }) {
  const icon = getIcon(category)
  const childCount = category.children?.length ?? 0

  return (
    <Link href={`/categoria/${category.slug}`} className="group block">
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 text-center hover:border-indigo-300 hover:shadow-md transition-all duration-200">
        <div
          className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl"
          style={{ background: `${placeholderColor(category.slug)}22` }}
        >
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-zinc-800 group-hover:text-indigo-700 transition-colors leading-tight">
          {category.name}
        </h3>
        {childCount > 0 && (
          <p className="text-[11px] text-zinc-400 mt-1">
            {childCount} subcategoría{childCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </Link>
  )
}
