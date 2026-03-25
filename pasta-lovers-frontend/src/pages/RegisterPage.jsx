import { useState } from 'react'
import { registerClient } from '../api/clientApi'

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    instagramHandle: '',
    instagramFollowConfirmed: false,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState(null)

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessData(null)

    try {
      const data = await registerClient(form)
      setSuccessData(data.client)
      setForm({
        name: '',
        phone: '',
        email: '',
        instagramHandle: '',
        instagramFollowConfirmed: false,
      })
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Ocurrió un error al registrar el cliente'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--pl-cream)] px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-5 overflow-hidden rounded-[28px] border border-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="bg-[var(--pl-green)] px-6 py-7 text-white">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/75">
              Pasta Lovers
            </p>
            <h1 className="font-brand text-3xl leading-tight">
              Cartón de fidelidad digital
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/85">
              Registrate, acumulá tus almuerzos y al completar 5 visitas llevate
              1 menú ejecutivo gratis.
            </p>
          </div>

          <div className="bg-[var(--pl-kraft)]/45 px-6 py-4">
            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-9 w-9 rounded-full border-2 border-white bg-white shadow-sm"
                />
              ))}
              <div className="flex h-9 min-w-[56px] items-center justify-center rounded-full bg-[var(--pl-red)] px-3 text-sm font-bold text-white shadow-sm">
                Gratis
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="mb-6">
            <h2 className="font-brand text-2xl text-[var(--pl-text)]">
              Creá tu tarjeta
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--pl-muted)]">
              Completá tus datos para empezar a sumar checks en Pasta Lovers.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
                Nombre completo
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Tu nombre"
                required
                className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3.5 text-[var(--pl-text)] outline-none transition focus:border-[var(--pl-green)] focus:ring-2 focus:ring-[var(--pl-green)]/15"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
                Número de teléfono
              </label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Ej.: 0981 123456"
                required
                className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3.5 text-[var(--pl-text)] outline-none transition focus:border-[var(--pl-green)] focus:ring-2 focus:ring-[var(--pl-green)]/15"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
                Mail
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3.5 text-[var(--pl-text)] outline-none transition focus:border-[var(--pl-green)] focus:ring-2 focus:ring-[var(--pl-green)]/15"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
                Usuario de Instagram
              </label>
              <input
                type="text"
                name="instagramHandle"
                value={form.instagramHandle}
                onChange={handleChange}
                placeholder="@tuusuario"
                className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3.5 text-[var(--pl-text)] outline-none transition focus:border-[var(--pl-green)] focus:ring-2 focus:ring-[var(--pl-green)]/15"
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-[var(--pl-green)]/15 bg-[var(--pl-cream)]/55 p-4 text-sm leading-6 text-[var(--pl-text)]">
              <input
                type="checkbox"
                name="instagramFollowConfirmed"
                checked={form.instagramFollowConfirmed}
                onChange={handleChange}
                className="mt-1 h-4 w-4 accent-[var(--pl-red)]"
              />
              <span>
                Confirmo que sigo a{' '}
                <span className="font-semibold">@pastaloverspy</span> en Instagram.
              </span>
            </label>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[var(--pl-green)] px-4 py-3.5 font-semibold text-white transition hover:bg-[var(--pl-green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creando tarjeta...' : 'Crear mi tarjeta digital'}
            </button>
          </form>

          {successData && (
            <div className="mt-6 rounded-[24px] border border-[var(--pl-green)]/15 bg-[var(--pl-cream)] p-5">
              <p className="font-brand text-xl text-[var(--pl-green)]">
                ¡Benvenuto a Pasta Lovers Club!
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--pl-muted)]">
                Tu tarjeta digital ya fue creada. Desde ahí vas a poder ver tu
                progreso, tu código y las promos activas de la semana.
              </p>

              <a
                href={`/card/${successData.uniqueToken}`}
                className="mt-4 inline-flex rounded-2xl bg-[var(--pl-red)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Ver mi tarjeta
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}