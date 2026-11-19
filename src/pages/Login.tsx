import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../lib/auth'
import { supabase, supabaseConfigured } from '../lib/supabase'

export default function Login() {
  const { session } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/ahli'

  const [params] = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>(params.has('daftar') ? 'signup' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'ok'; text: string } | null>(null)

  if (session) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    setBusy(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else if (mode === 'signup') {
      setMessage({ type: 'ok', text: 'Akaun dicipta. Semak email untuk pengesahan (jika diminta), kemudian log masuk.' })
      setMode('login')
    }
  }

  async function resetPassword() {
    if (!email) return setMessage({ type: 'error', text: 'Isi email dahulu.' })
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` })
    setMessage(error ? { type: 'error', text: error.message } : { type: 'ok', text: 'Link reset password dihantar ke email.' })
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <Logo />
        <h1>{mode === 'login' ? 'Log masuk ahli' : 'Daftar akaun percuma'}</h1>
        {!supabaseConfigured && (
          <p className="alert error">Supabase belum disambung. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.</p>
        )}
        <form onSubmit={onSubmit} className="stack">
          {mode === 'signup' && (
            <label>Nama penuh<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          )}
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {message && <p className={`alert ${message.type}`}>{message.text}</p>}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Sila tunggu…' : mode === 'login' ? 'Log masuk' : 'Daftar'}</button>
        </form>
        <div className="auth-links">
          {mode === 'login' ? (
            <>
              <button className="btn-link" onClick={() => setMode('signup')}>Belum ada akaun? Daftar</button>
              <button className="btn-link" onClick={resetPassword}>Lupa password</button>
            </>
          ) : (
            <button className="btn-link" onClick={() => setMode('login')}>Dah ada akaun? Log masuk</button>
          )}
        </div>
      </div>
    </div>
  )
}
