'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/api-auth'

interface Stats {
  products: number
  orders_pending: number
  orders_today: number
  imports_pending: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    async function load() {
      const [products, orders, imports] = await Promise.all([
        authFetch<{ total: number }>('/admin/products?page_size=1').catch(() => ({ total: 0 })),
        authFetch<Array<{ status: string }>>('/admin/orders?page_size=200').catch(() => [] as Array<{ status: string }>),
        authFetch<Array<{ status: string }>>('/admin/imports').catch(() => [] as Array<{ status: string }>),
      ])

      const orderArr = Array.isArray(orders) ? orders : []
      const importArr = Array.isArray(imports) ? imports : []

      setStats({
        products: (products as { total: number }).total,
        orders_pending: orderArr.filter((o) => o.status === 'pending').length,
        orders_today: orderArr.filter((o) => {
          const d = new Date((o as { created_at?: string }).created_at || '')
          const today = new Date()
          return d.toDateString() === today.toDateString()
        }).length,
        imports_pending: importArr.filter((j) => j.status === 'pending' || j.status === 'processing').length,
      })
    }
    load()
  }, [])

  const cards = [
    { label: 'Productos activos', value: stats?.products ?? '—', href: '/admin/productos', color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Órdenes pendientes', value: stats?.orders_pending ?? '—', href: '/admin/ordenes?status=pending', color: 'bg-amber-50 text-amber-700' },
    { label: 'Órdenes hoy', value: stats?.orders_today ?? '—', href: '/admin/ordenes', color: 'bg-green-50 text-green-700' },
    { label: 'Imports activos', value: stats?.imports_pending ?? '—', href: '/admin/imports', color: 'bg-rose-50 text-rose-700' },
  ]

  return (
    <div className="px-8 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-2xl p-6 ${card.color} hover:opacity-80 transition-opacity`}
          >
            <p className="text-3xl font-extrabold mb-1">{card.value}</p>
            <p className="text-sm font-medium">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: '/admin/categorias', title: 'Categorías', desc: 'Gestionar árbol de categorías y atributos' },
          { href: '/admin/productos', title: 'Productos', desc: 'CRUD individual, imágenes de variantes' },
          { href: '/admin/inventario', title: 'Inventario', desc: 'Ajuste manual de stock con auditoría' },
          { href: '/admin/ordenes', title: 'Órdenes', desc: 'Ver y cambiar estado de pedidos' },
          { href: '/admin/cupones', title: 'Cupones', desc: 'Crear y gestionar códigos de descuento' },
          { href: '/admin/imports', title: 'Imports', desc: 'Subir CSV/XLSX para carga masiva de productos' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <h3 className="font-bold text-zinc-900 mb-1">{item.title}</h3>
            <p className="text-sm text-zinc-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
