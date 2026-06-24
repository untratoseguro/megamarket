'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/api-auth'

interface Coupon {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_order_amount: number | null
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
}

const EMPTY = {
  code: '',
  discount_type: 'percent' as 'percent' | 'fixed',
  discount_value: '',
  min_order_amount: '',
  max_uses: '',
  expires_at: '',
  is_active: true,
}

export default function CuponesAdmin() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const data = await authFetch<Coupon[]>('/admin/coupons').catch(() => [])
    setCoupons(data)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const body = {
        code: form.code.toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
        is_active: form.is_active,
      }
      if (editing) {
        await authFetch(`/admin/coupons/${editing}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await authFetch('/admin/coupons', { method: 'POST', body: JSON.stringify(body) })
      }
      setForm(EMPTY)
      setEditing(null)
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error guardando cupón')
    } finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cupón?')) return
    try {
      await authFetch(`/admin/coupons/${id}`, { method: 'DELETE' })
      await load()
    } catch { alert('Error eliminando cupón') }
  }

  function startEdit(c: Coupon) {
    setEditing(c.id)
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order_amount: c.min_order_amount != null ? String(c.min_order_amount) : '',
      max_uses: c.max_uses != null ? String(c.max_uses) : '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
      is_active: c.is_active,
    })
  }

  return (
    <div className="px-8 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Cupones</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-2xl p-6 mb-8 grid grid-cols-2 gap-4">
        <h2 className="col-span-2 text-base font-semibold text-zinc-800">{editing ? 'Editar cupón' : 'Nuevo cupón'}</h2>
        {error && <p className="col-span-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Código * (se guarda en mayúsculas)</label>
          <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="VERANO25" className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo *</label>
          <select required value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed' }))}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="percent">Porcentaje (%)</option>
            <option value="fixed">Monto fijo (USD)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            Valor * {form.discount_type === 'percent' ? '(0–100%)' : '(USD)'}
          </label>
          <input required type="number" step="0.01" min="0" max={form.discount_type === 'percent' ? '100' : undefined}
            value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Monto mínimo de orden (USD)</label>
          <input type="number" step="0.01" min="0" value={form.min_order_amount}
            onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
            placeholder="0 = sin mínimo" className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Usos máximos</label>
          <input type="number" min="1" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
            placeholder="vacío = ilimitado" className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha de expiración</label>
          <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <input type="checkbox" id="coupon_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          <label htmlFor="coupon_active" className="text-sm text-zinc-700">Activo</label>
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
              <th className="px-5 py-3 text-left">Código</th>
              <th className="px-5 py-3 text-center">Tipo</th>
              <th className="px-5 py-3 text-right">Valor</th>
              <th className="px-5 py-3 text-right">Usos</th>
              <th className="px-5 py-3 text-left">Expira</th>
              <th className="px-5 py-3 text-center">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {coupons.map(c => (
              <tr key={c.id} className="hover:bg-zinc-50">
                <td className="px-5 py-3 font-mono font-bold text-zinc-900 tracking-wider">{c.code}</td>
                <td className="px-5 py-3 text-center text-zinc-500 text-xs">{c.discount_type === 'percent' ? 'Porcentaje' : 'Fijo'}</td>
                <td className="px-5 py-3 text-right font-semibold">
                  {c.discount_type === 'percent' ? `${c.discount_value}%` : `$${c.discount_value.toFixed(2)}`}
                </td>
                <td className="px-5 py-3 text-right text-zinc-500">
                  {c.uses_count}{c.max_uses != null ? ` / ${c.max_uses}` : ''}
                </td>
                <td className="px-5 py-3 text-xs text-zinc-500">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString('es-SV') : '—'}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    {c.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right space-x-3">
                  <button onClick={() => startEdit(c)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Editar</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {coupons.length === 0 && <p className="text-center text-zinc-400 py-8 text-sm">Sin cupones.</p>}
      </div>
    </div>
  )
}
