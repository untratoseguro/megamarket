'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/api-auth'
import { formatUSD } from '@/lib/utils'

interface Product {
  id: string
  title: string
  sku: string
  price: number
  stock_quantity: number
  is_active: boolean
  is_featured: boolean
  category_id: string | null
  created_at: string
}

interface ProductsResp {
  items: Product[]
  total: number
  page: number
  page_size: number
}

interface Category { id: string; name: string; slug: string }

const EMPTY_FORM = {
  title: '', sku: '', price: '', compare_at_price: '', stock_quantity: '0',
  category_id: '', brand: '', short_description: '', is_featured: false, is_active: true,
  attributes_json: '{}',
}

export default function ProductosAdmin() {
  const [resp, setResp] = useState<ProductsResp | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const params = new URLSearchParams({ page: String(page), page_size: '30' })
    if (q) params.set('q', q)
    const data = await authFetch<ProductsResp>(`/admin/products?${params}`).catch(() => null)
    setResp(data)
  }

  useEffect(() => { load() }, [page, q])
  useEffect(() => {
    authFetch<Category[]>('/admin/categories').then(setCategories).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      let attrs = {}
      try { attrs = JSON.parse(form.attributes_json) } catch { throw new Error('attributes_json no es JSON válido') }
      const body = {
        title: form.title, sku: form.sku,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        stock_quantity: parseInt(form.stock_quantity || '0'),
        category_id: form.category_id || null,
        brand: form.brand || null,
        short_description: form.short_description || null,
        is_featured: form.is_featured,
        is_active: form.is_active,
        attributes_json: attrs,
      }
      if (editId) {
        await authFetch(`/admin/products/${editId}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await authFetch('/admin/products', { method: 'POST', body: JSON.stringify(body) })
      }
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error guardando producto')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Deshabilitar este producto?')) return
    try {
      await authFetch(`/admin/products/${id}`, { method: 'DELETE' })
      await load()
    } catch { alert('Error') }
  }

  const totalPages = resp ? Math.ceil(resp.total / resp.page_size) : 1

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Productos</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">+ Nuevo producto</button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input placeholder="Buscar por título o SKU…" value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
          className="w-full max-w-sm border border-zinc-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-indigo-200 rounded-2xl p-6 mb-6 grid grid-cols-2 gap-4">
          <h2 className="col-span-2 text-base font-semibold text-zinc-800">{editId ? 'Editar producto' : 'Nuevo producto'}</h2>
          {error && <p className="col-span-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {[
            { key: 'title', label: 'Título *', req: true, span: 2 },
            { key: 'sku', label: 'SKU *', req: true },
            { key: 'brand', label: 'Marca' },
            { key: 'price', label: 'Precio * (USD)', req: true, type: 'number' },
            { key: 'compare_at_price', label: 'Precio anterior (USD)', type: 'number' },
            { key: 'stock_quantity', label: 'Stock', type: 'number' },
          ].map(({ key, label, req, span, type }) => (
            <div key={key} className={span === 2 ? 'col-span-2' : ''}>
              <label className="block text-xs font-medium text-zinc-600 mb-1">{label}</label>
              <input required={req} type={type || 'text'} value={(form as Record<string, string | boolean>)[key] as string}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                step={type === 'number' ? 'any' : undefined}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Categoría</label>
            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm">
              <option value="">— Sin categoría —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Descripción corta</label>
            <input value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-zinc-600 mb-1">Atributos (JSON)</label>
            <input value={form.attributes_json} onChange={e => setForm(f => ({ ...f, attributes_json: e.target.value }))} placeholder='{}'
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="col-span-2 flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
              Destacado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Activo
            </label>
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Guardando…' : editId ? 'Actualizar' : 'Crear'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="text-zinc-500 px-4 py-2 text-sm hover:text-zinc-800">Cancelar</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Título / SKU</th>
              <th className="px-5 py-3 text-right">Precio</th>
              <th className="px-5 py-3 text-right">Stock</th>
              <th className="px-5 py-3 text-center">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(resp?.items || []).map(p => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-zinc-900 line-clamp-1">{p.title}</p>
                  <p className="text-xs text-zinc-400 font-mono">{p.sku}</p>
                </td>
                <td className="px-5 py-3 text-right font-semibold">{formatUSD(p.price)}</td>
                <td className="px-5 py-3 text-right">{p.stock_quantity}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right space-x-3">
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Deshabilitar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {resp?.items.length === 0 && <p className="text-center text-zinc-400 py-8 text-sm">Sin resultados.</p>}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg disabled:opacity-40 hover:bg-zinc-50">Anterior</button>
          <span className="px-4 py-1.5 text-sm text-zinc-600">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg disabled:opacity-40 hover:bg-zinc-50">Siguiente</button>
        </div>
      )}
    </div>
  )
}
