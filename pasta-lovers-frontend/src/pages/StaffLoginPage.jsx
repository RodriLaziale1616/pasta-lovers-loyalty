import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginStaff } from '../api/authApi'
import { saveStaffToken } from '../utils/staffAuth'

export default function StaffLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await loginStaff({ email, password })
      saveStaffToken(data.token)
      navigate('/staff')
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--modo-cream)] px-3 py-5 sm:px-5 sm:py-10">
      <div className="w-full max-w-md overflow-hidden rounded-[26px] bg-white shadow-[0_20px_55px_rgba(69,44,28,.12)] ring-1 ring-black/5">
        <div className="bg-[var(--modo-card)] px-5 py-6 text-white sm:px-7">
          <img src="/modo-cafe-logo.jpg" alt="Modo Café" className="h-16 w-auto rounded-xl bg-white object-contain px-2 py-1" />
          <p className="mt-5 text-[10px] font-black uppercase tracking-[.22em] text-white/50">Modo Café · Mostrador</p>
          <h1 className="mt-1 text-3xl font-black">Pass</h1>
          <p className="mt-2 max-w-xs text-sm leading-6 text-white/60">Acceso interno para vender, consultar y canjear pases prepagados.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-7">
          <div>
            <label className="mb-1.5 block text-sm font-black">Email</label>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="modo-input" placeholder="tu@email.com" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-black">Contraseña</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" className="modo-input" placeholder="••••••••" />
          </div>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

          <button type="submit" disabled={loading} className="modo-btn-primary w-full px-4 py-4 disabled:opacity-50">
            {loading ? 'INGRESANDO…' : 'INGRESAR AL MOSTRADOR'}
          </button>
        </form>
      </div>
    </div>
  )
}
