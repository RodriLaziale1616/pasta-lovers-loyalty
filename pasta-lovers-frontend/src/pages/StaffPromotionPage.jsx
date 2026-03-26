import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPromotion } from '../api/promotionApi'
import { getStaffToken } from '../utils/staffAuth'

export default function StaffPromotionsPage() {
  const navigate = useNavigate()
  const authToken = getStaffToken()

  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    buttonText: '',
    buttonLink: '',
    priority: 0,
    isActive: true,
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
    setMessage('')
    setError('')

    try {
      const payload = {
        ...form,
        priority: Number(form.priority || 0),
      }

      const data = await createPromotion(payload, authToken)
      setMessage(data.message || 'Promoción creada correctamente')

      setForm({
        title: '',
        description: '',
        imageUrl: '',
        buttonText: '',
        buttonLink: '',
        priority: 0,
        isActive: true,
      })
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear la promoción')
    } finally {
      setLoading(false)
    }
  }

  const previewButtonText = useMemo(() => {
    return form.buttonText?.trim() || 'Ver más'
  }, [form.buttonText])

  return (
    <div className="min-h-screen bg-[var(--pl-cream)] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center justify-between rounded-[24px] bg-white px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--pl-muted)]">
              Pasta Lovers Staff
            </p>
            <h1 className="font-brand text-2xl text-[var(--pl-text)]">
              Crear promoción
            </h1>
          </div>

          <button
            onClick={() => navigate('/staff')}
            className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--pl-text)]"
          >
            Volver al panel
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <h2 className="font-brand text-2xl text-[var(--pl-text)]">
              Formulario
            </h2>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
                  Título
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Ej: Jueves de ñoquis"
                  className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Texto corto de la promoción"
                  className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
                  URL de imagen
                </label>
                <input
                  name="imageUrl"
                  value={form.imageUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
                    Texto del botón
                  </label>
                  <input
                    name="buttonText"
                    value={form.buttonText}
                    onChange={handleChange}
                    placeholder="Reservá ahora"
                    className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
                    Link del botón
                  </label>
                  <input
                    name="buttonLink"
                    value={form.buttonLink}
                    onChange={handleChange}
                    placeholder="https://wa.me/..."
                    className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
                  Prioridad
                </label>
                <input
                  type="number"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--pl-cream)]/35 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                />
                Promoción activa
              </label>

              {message && (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {message}
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[var(--pl-red)] px-4 py-3.5 font-semibold text-white"
              >
                {loading ? 'Guardando...' : 'Crear promoción'}
              </button>
            </form>
          </div>

          <div className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <h2 className="font-brand text-2xl text-[var(--pl-text)]">
              Preview estilo Instagram
            </h2>

            <div className="mt-5 overflow-hidden rounded-[26px] border border-black/10 bg-white">
              <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pl-green)] text-sm font-bold text-white">
                  PL
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--pl-text)]">
                    pastaloverspy
                  </p>
                  <p className="text-xs text-[var(--pl-muted)]">Promoción</p>
                </div>
              </div>

              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt="Preview promo"
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-[var(--pl-cream)] text-sm text-[var(--pl-muted)]">
                  Acá se verá tu flyer
                </div>
              )}

              <div className="px-4 py-4">
                <p className="text-sm font-semibold text-[var(--pl-text)]">
                  pastaloverspy
                </p>

                <p className="mt-2 font-brand text-2xl text-[var(--pl-red)]">
                  {form.title || 'Tu título de promoción'}
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--pl-text)]">
                  {form.description || 'Acá vas a ver cómo quedará el texto de la promoción.'}
                </p>

                <button
                  type="button"
                  className="mt-4 rounded-2xl bg-[var(--pl-green)] px-4 py-3 text-sm font-semibold text-white"
                >
                  {previewButtonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
