import Link from 'next/link'
import type { Breadcrumb } from '@/types'

interface BreadcrumbsProps {
  items: Breadcrumb[]
  current?: string
}

export default function Breadcrumbs({ items, current }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm flex-wrap">
        <li>
          <Link href="/" className="text-zinc-400 hover:text-indigo-600 transition-colors">
            Inicio
          </Link>
        </li>
        {items.map((crumb) => (
          <li key={crumb.id} className="flex items-center gap-1.5">
            <span className="text-zinc-300">/</span>
            <Link
              href={`/categoria/${crumb.slug}`}
              className="text-zinc-400 hover:text-indigo-600 transition-colors"
            >
              {crumb.name}
            </Link>
          </li>
        ))}
        {current && (
          <li className="flex items-center gap-1.5">
            <span className="text-zinc-300">/</span>
            <span className="text-zinc-700 font-medium">{current}</span>
          </li>
        )}
      </ol>
    </nav>
  )
}
