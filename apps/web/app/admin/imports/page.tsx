'use client'

import { useEffect, useRef, useState } from 'react'
import { authFetch } from '@/lib/api-auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface ImportJob {
  id: string
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
  total_rows: number | null
  processed_rows: number | null
  error_count: number | null
  errors: Array<{ row: number; error: string }> | null
  created_at: string
  finished_at: string | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En cola', processing: 'Procesando', completed: 'Completado',
  completed_with_errors: 'Con errores', failed: 'Fallido',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  completed_with_errors: 'bg-orange-50 text-orange-700',
  failed: 'bg-red-50 text-red-700',
}

const CSV_COLUMNS = ['title', 'sku', 'price', 'stock_quantity', 'category_slug', 'brand', 'short_description', 'compare_at_price', 'is_featured', 'is_active', 'attributes_json']

export default function ImportsAdmin() {
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [expandedErrors, setExpandedErrors] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function load() {
    const data = await authFetch<ImportJob[]>('/admin/imports').catch(() => [])
    setJobs(data)
    return data
  }

  useEffect(() => {
    load()
  }, [])

  // Poll while any job is pending/processing
  useEffect(() => {
    const active = jobs.some(j => j.status === 'pending' || j.status === 'processing')
    if (active && !pollRef.current) {
      pollRef.current = setInterval(load, 3000)
    } else if (!active && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [jobs])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_URL}/admin/imports/upload`, {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: formData,
      })
      if (!res.ok) { const t = await res.text().catch(() => res.statusText); throw new Error(`${res.status}: ${t}`) }
      if (fileRef.current) fileRef.current.value = ''
      const data = await load()
      const active = data.some(j => j.status === 'pending' || j.status === 'processing')
      if (active && !pollRef.current) {
        pollRef.current = setInterval(load, 3000)
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error subiendo archivo')
    } finally { setUploading(false) }
  }

  async function handleTemplateDownload() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${API_URL}/admin/imports/template.csv`, {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'megamarket_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Imports</h1>
        <button onClick={handleTemplateDownload} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5">
          ↓ Descargar plantilla CSV
        </button>
      </div>

      {/* Format guide */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-sm">
        <p className="font-semibold text-amber-800 mb-2">Formato del CSV/XLSX</p>
        <p className="text-amber-700 mb-2">Columnas requeridas: <span className="font-mono font-bold">title, sku, price, stock_quantity, category_slug</span></p>
        <p className="text-amber-700 mb-3">Columnas opcionales: <span className="font-mono text-xs">{CSV_COLUMNS.filter(c => !['title','sku','price','stock_quantity','category_slug'].includes(c)).join(', ')}</span></p>
        <ul className="text-amber-700 space-y-1 text-xs list-disc list-inside">
          <li>La columna <code>category_slug</code> debe coincidir con el slug de una categoría existente.</li>
          <li>Si un SKU ya existe, el producto se <strong>sobreescribe</strong> (UPSERT). Útil para re-importar feeds actualizados.</li>
          <li>Errores por fila no detienen el lote; se reportan al finalizar.</li>
          <li>Tamaño máximo: 10 MB. Formatos: .csv (UTF-8 o UTF-8-BOM), .xlsx, .xls</li>
          <li><code>attributes_json</code> debe ser JSON válido, ej: <code>{`{"color":"rojo","talla":"M"}`}</code></li>
          <li><code>is_featured</code> e <code>is_active</code>: valores <code>true</code>/<code>false</code> o <code>1</code>/<code>0</code>.</li>
        </ul>
      </div>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="bg-white border border-zinc-200 rounded-2xl p-6 mb-8">
        <p className="text-sm font-medium text-zinc-700 mb-3">Subir archivo</p>
        {uploadError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{uploadError}</p>}
        <div className="flex gap-3 items-center">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" required
            className="flex-1 text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-sm file:font-medium hover:file:bg-indigo-100 cursor-pointer" />
          <button type="submit" disabled={uploading} className="shrink-0 bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {uploading ? 'Subiendo…' : 'Subir y procesar'}
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-2">El archivo se procesa en background. Verás el progreso en la tabla de abajo.</p>
      </form>

      {/* Jobs table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Archivo</th>
              <th className="px-5 py-3 text-left">Creado</th>
              <th className="px-5 py-3 text-center">Progreso</th>
              <th className="px-5 py-3 text-center">Estado</th>
              <th className="px-5 py-3 text-right">Errores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {jobs.map(job => (
              <>
                <tr key={job.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3">
                    <p className="text-zinc-800 text-sm font-medium">{job.filename}</p>
                    <p className="text-xs text-zinc-400 font-mono">{job.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-500 whitespace-nowrap">
                    {new Date(job.created_at).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {job.total_rows != null ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-32 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${Math.round(((job.processed_rows ?? 0) / job.total_rows) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-400">{job.processed_rows ?? 0} / {job.total_rows}</span>
                      </div>
                    ) : <span className="text-zinc-400 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                      {STATUS_LABELS[job.status] ?? job.status}
                      {(job.status === 'pending' || job.status === 'processing') && (
                        <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {(job.error_count ?? 0) > 0 ? (
                      <button
                        onClick={() => setExpandedErrors(expandedErrors === job.id ? null : job.id)}
                        className="text-orange-600 hover:text-orange-800 text-xs font-medium"
                      >
                        {job.error_count} {expandedErrors === job.id ? '▲' : '▼'}
                      </button>
                    ) : (
                      <span className="text-zinc-400 text-xs">{job.status === 'completed' ? '0' : '—'}</span>
                    )}
                  </td>
                </tr>
                {expandedErrors === job.id && job.errors && job.errors.length > 0 && (
                  <tr key={`${job.id}-errors`}>
                    <td colSpan={5} className="bg-orange-50 px-5 py-3">
                      <p className="text-xs font-semibold text-orange-700 mb-2">Errores por fila:</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {job.errors.map((err, i) => (
                          <p key={i} className="text-xs text-orange-700">
                            <span className="font-mono font-bold">Fila {err.row}:</span> {err.error}
                          </p>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && <p className="text-center text-zinc-400 py-8 text-sm">Sin imports aún.</p>}
      </div>
    </div>
  )
}
