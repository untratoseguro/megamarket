'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/api-auth'

interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
  sort_order: number
  is_active: boolean
}

const EMPTY: Partial<Category> & { parent_id: string } = { name: '', slug: '', parent_id: '', sort_order: 0, is_active: true }

export default function CategoriasAdmin() {
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const data = await authFetch<Category[]>('/admin/categories').catch(() => [])
    setCategories(data)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const body = {
        name: form.name,
        slug: form.slug || undefined,
        parent_id: form.parent_id || null,
        sort_order: form.sort_order ?? 0,
        is_active: form.is_active,
      }
      if (editing) {
        await authFetch(`/admin/categories/${editing}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await authFetch('/admin/categories', { method: 'POST', body: JSON.stringify(body) })
      }
      setForm(EMPTY)
      setEditing(null)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error guardando categoría')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta categoría?')) return
    try {
      await authFetch(`/admin/categories/${id}`, { method: 'DELETE' })
      await load()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error eliminando')
    }
  }

  function startEdit(cat: Category) {
    setEditing(cat.id)
    setForm({ name: cat.name, slug: cat.slug, parent_id: cat.parent_id || '', sort_order: cat.sort_order, is_active: cat.is_active })
  }

  return (
    <div className="px-8 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Categorías</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-2xl p-6 mb-8 grid grid-cols-2 gap-4">
        <h2 className="col-span-2 text-base font-semibold text-zinc-800">{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>
        {error && <p className="col-span-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre *</label>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Slug (auto si vacío)</label>
          <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="mi-categoria" className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Categoría padre</label>
          <select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">— Raíz —</option>
            {categories.filter(c => c.id !== editing).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Orden</label>
          <input type="number" value={form.sort_order ?? 0} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <input type="checkbox" id="is_active" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          <label htmlFor="is_active" className="text-sm text-zinc-700">Activa</label>
        </div>
        <div className="col-span-2 flex gap-3">
          <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Guardando…' : editing ? 'Actualizar' : 'Crear'}
          </button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(EMPTY) }} className="text-zinc-500 px-4 py-2 text-sm hover:text-zinc-800">Cancelar</button>}
        </div>
      </form>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Nombre</th>
              <th className="px-5 py-3 text-left">Slug</th>
              <th className="px-5 py-3 text-left">Padre</th>
              <th className="px-5 py-3 text-center">Orden</th>
              <th className="px-5 py-3 text-center">Activa</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {categories.map(cat => {
              const parent = categories.find(c => c.id === cat.parent_id)
              return (
                <tr key={cat.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 font-medium text-zinc-900">{cat.name}</td>
                  <td className="px-5 py-3 text-zinc-500 font-mono text-xs">{cat.slug}</td>
                  <td className="px-5 py-3 text-zinc-500">{parent?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-center text-zinc-500">{cat.sort_order}</td>
                  <td className="px-5 py-3 text-center">{cat.is_active ? '✓' : '✗'}</td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => startEdit(cat)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Editar</button>
                    <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Eliminar</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {categories.length === 0 && <p className="text-center text-zinc-400 py-8 text-sm">Sin categorías aún.</p>}
      </div>
    </div>
  )
}
