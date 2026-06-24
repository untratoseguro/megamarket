'use client'

import { useEffect, useRef, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

async function sendChat(message: string, sessionId: string | null, token: string | null): Promise<{ session_id: string; message: string }> {
  const res = await fetch(`${API_URL}/assistant/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ session_id: sessionId, message }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json()
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getSession().then(({ data: { session } }) => {
        setToken(session?.access_token ?? null)
      })
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    setError('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await sendChat(msg, sessionId, token)
      setSessionId(res.session_id)
      setMessages(prev => [...prev, { role: 'assistant', content: res.message }])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: 'monospace', maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
        {sessionId ? `session: ${sessionId.slice(0, 8)}…` : 'Nueva sesión'} | {token ? 'autenticado' : 'anónimo'}
      </p>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, minHeight: 300, maxHeight: 480, overflowY: 'auto', padding: 12, marginBottom: 8, background: '#fafafa' }}>
        {messages.length === 0 && <p style={{ color: '#aaa', fontSize: 13 }}>Escribe un mensaje para empezar…</p>}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <span style={{ fontSize: 10, color: '#999', display: 'block', marginBottom: 2 }}>
              {m.role === 'user' ? 'Tú' : 'Asistente'}
            </span>
            <span style={{
              display: 'inline-block', padding: '6px 10px', borderRadius: 8, fontSize: 13,
              background: m.role === 'user' ? '#4f46e5' : '#fff',
              color: m.role === 'user' ? '#fff' : '#111',
              border: m.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
              maxWidth: '80%', textAlign: 'left', whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </span>
          </div>
        ))}
        {loading && <p style={{ color: '#888', fontSize: 12 }}>Pensando…</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p style={{ color: 'red', fontSize: 12, marginBottom: 6 }}>{error}</p>}

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 6 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Escribe aquí…" disabled={loading}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
        />
        <button type="submit" disabled={loading || !input.trim()}
          style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
          Enviar
        </button>
      </form>
      <p style={{ fontSize: 10, color: '#bbb', marginTop: 4 }}>
        Componente de prueba — sin estilizar. Rate limit: 10 msg/min.
      </p>
    </div>
  )
}
