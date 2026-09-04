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
    <div className="flex min-h-screen items-center justify-center bg-[var(--modo-cream)] px-4 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-[0_20px_60px_rgba(41,37,31,0.12)] ring-1 ring-black/5">
        <div className="bg-[var(--modo-ink)] px-6 py-7 text-white">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--modo-orange)] text-2xl font-black text-[var(--modo-ink)]">M</div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/55">Modo Café</p>
          <h1 className="mt-1 text-3xl font-black">Pass</h1>
          <p className="mt-2 max-w-xs text-sm leading-6 text-white/60">Acceso interno para vender, consultar y canjear pases prepagados.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-2xl border border-black/10 bg-[var(--modo-cream)] px-4 py-3.5 outline-none focus:border-[var(--modo-green)] focus:ring-2 focus:ring-[var(--modo-green)]/10"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-2xl border border-black/10 bg-[var(--modo-cream)] px-4 py-3.5 outline-none focus:border-[var(--modo-green)] focus:ring-2 focus:ring-[var(--modo-green)]/10"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[var(--modo-green)] px-4 py-4 font-black text-white transition hover:bg-[var(--modo-green-dark)] disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'INGRESAR AL MOSTRADOR'}
          </button>
        </form>
      </div>
    </div>
  )
}
