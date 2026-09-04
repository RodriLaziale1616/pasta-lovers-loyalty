import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useParams } from 'react-router-dom'
import { claimGift, previewGift } from '../api/passApi'

function formatMoney(value, currency = 'PYG') {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function GiftClaimPage() {
  const { token } = useParams()
  const [gift, setGift] = useState(null)
  const [claimedPass, setClaimedPass] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadGift() {
      try {
        const data = await previewGift(token)
        setGift(data.gift)
      } catch (err) {
        setError(err?.response?.data?.message || 'Este Gift Pass no está disponible.')
      } finally {
        setLoading(false)
      }
    }

    loadGift()
  }, [token])

  async function handleClaim(event) {
    event.preventDefault()
    try {
      setLoading(true)
      setError('')
      const data = await claimGift(token, form)
      setClaimedPass(data.pass)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo activar el Gift Pass.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !gift && !claimedPass) {
    return <div className="grid min-h-screen place-items-center bg-[var(--modo-cream)] font-semibold">Preparando tu regalo…</div>
  }

  return (
    <div className="min-h-screen bg-[var(--modo-cream)] px-4 py-8 text-[var(--modo-ink)]">
      <div className="mx-auto max-w-lg overflow-hidden rounded-[32px] bg-white shadow-xl ring-1 ring-black/5">
        <div className="bg-[var(--modo-ink)] p-7 text-white">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--modo-orange)] text-xl font-black text-[var(--modo-ink)]">M</div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-white/55">Modo Café · Gift Pass</p>
          <h1 className="mt-2 text-3xl font-black">Tenés un regalo ☕</h1>
          {gift?.purchaserName && <p className="mt-2 text-white/65">De parte de {gift.purchaserName}</p>}
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {claimedPass ? (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-2xl">✓</div>
              <h2 className="mt-4 text-2xl font-black">¡Gift Pass activado!</h2>
              <p className="mt-2 text-sm text-black/55">Ya quedó asociado a {claimedPass.client?.name}.</p>

              <div className="mt-6 rounded-3xl bg-[var(--modo-ink)] p-6 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">{claimedPass.product?.name}</p>
                <p className="mt-2 text-3xl font-black">
                  {claimedPass.unitType === 'MONEY'
                    ? formatMoney(claimedPass.remainingAmount, claimedPass.product?.currency)
                    : `${claimedPass.remainingUnits} consumos`}
                </p>
                <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3">
                  <QRCodeSVG value={`modo-pass:${claimedPass.publicId}`} size={190} />
                </div>
                <p className="mt-4 text-xs text-white/55">Mostrá este QR en caja para identificar tu pase.</p>
              </div>

              <div className="mt-5 rounded-2xl bg-[var(--modo-orange-soft)] p-4 text-left text-sm">
                <strong>Próxima mejora:</strong> este acceso quedará vinculado a tu teléfono con código OTP y Face ID/huella, para que no dependas de una captura del QR.
              </div>
            </div>
          ) : gift ? (
            <>
              <div className="rounded-3xl bg-[var(--modo-orange-soft)] p-5">
                <p className="text-sm font-bold">{gift.productName}</p>
                <p className="mt-2 text-3xl font-black">
                  {gift.unitType === 'MONEY'
                    ? formatMoney(gift.initialAmount, gift.currency)
                    : `${gift.initialUnits} consumos`}
                </p>
                {gift.description && <p className="mt-2 text-sm text-black/55">{gift.description}</p>}
              </div>

              <form onSubmit={handleClaim} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-bold">Tu nombre</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--modo-cream)] px-4 py-3 outline-none focus:border-[var(--modo-green)]"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold">Tu teléfono</label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--modo-cream)] px-4 py-3 outline-none focus:border-[var(--modo-green)]"
                    placeholder="0981 123 456"
                    inputMode="tel"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold">Email <span className="font-normal text-black/40">(opcional)</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--modo-cream)] px-4 py-3 outline-none focus:border-[var(--modo-green)]"
                    placeholder="juan@email.com"
                  />
                </div>

                <button
                  disabled={loading}
                  className="w-full rounded-2xl bg-[var(--modo-green)] px-4 py-4 font-black text-white disabled:opacity-50"
                >
                  {loading ? 'ACTIVANDO…' : 'ACTIVAR MI GIFT PASS'}
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
