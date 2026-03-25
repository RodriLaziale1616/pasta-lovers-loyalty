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

  async function handleSubmit(e) {
    e.preventDefault()
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
    <div className="min-h-screen bg-[var(--pl-cream)] px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--pl-muted)]">
          Pasta Lovers Staff
        </p>
        <h1 className="font-brand mt-2 text-3xl text-[var(--pl-text)]">
          Iniciar sesión
        </h1>
        <p className="mt-2 text-sm text-[var(--pl-muted)]">
          Acceso interno para registrar checks y canjear premios.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3.5 outline-none focus:border-[var(--pl-green)] focus:ring-2 focus:ring-[var(--pl-green)]/15"
              placeholder="admin@pastalovers.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3.5 outline-none focus:border-[var(--pl-green)] focus:ring-2 focus:ring-[var(--pl-green)]/15"
              placeholder="********"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[var(--pl-green)] px-4 py-3.5 font-semibold text-white transition hover:bg-[var(--pl-green-dark)] disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}