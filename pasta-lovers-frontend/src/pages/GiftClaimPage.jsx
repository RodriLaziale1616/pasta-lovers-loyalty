import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { claimGift, previewGift } from '../api/passApi'

function formatMoney(value, currency = 'PYG') {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

const CONFETTI = [
  ['-92px', '0ms'], ['-68px', '80ms'], ['-42px', '140ms'], ['-18px', '40ms'],
  ['15px', '120ms'], ['42px', '30ms'], ['70px', '160ms'], ['96px', '70ms'],
  ['-115px', '180ms'], ['118px', '200ms'], ['-55px', '240ms'], ['55px', '220ms'],
]

function GiftBox({ open = false, confetti = false }) {
  return (
    <div className="relative mx-auto h-[180px] w-[220px] overflow-visible">
      {confetti && CONFETTI.map(([x, delay], index) => (
        <span
          key={`${x}-${delay}`}
          className="confetti-piece"
          style={{ '--x': x, '--delay': delay, background: index % 3 === 0 ? 'var(--modo-red)' : index % 3 === 1 ? 'var(--modo-beige)' : 'var(--modo-brown)' }}
        />
      ))}

      <div className={`absolute inset-0 ${open ? 'gift-box-open' : 'gift-box-idle'}`}>
        <div className="absolute bottom-5 left-1/2 h-[96px] w-[150px] -translate-x-1/2 rounded-[18px] bg-[var(--modo-red)] shadow-[0_18px_35px_rgba(197,31,41,.25)]">
          <div className="absolute left-1/2 top-0 h-full w-[28px] -translate-x-1/2 bg-[var(--modo-beige)]" />
          <div className="absolute left-0 top-[36px] h-[22px] w-full bg-[var(--modo-beige)]/95" />
        </div>
        <div className="gift-lid absolute left-1/2 top-[45px] h-[36px] w-[170px] -translate-x-1/2 rounded-[14px] bg-[var(--modo-red-dark)] shadow-lg">
          <div className="absolute left-1/2 top-0 h-full w-[30px] -translate-x-1/2 bg-[var(--modo-beige)]" />
        </div>
        <div className="absolute left-1/2 top-[18px] h-[44px] w-[56px] -translate-x-[92%] rotate-[-18deg] rounded-[50%_50%_45%_55%] border-[12px] border-[var(--modo-beige)] border-r-transparent" />
        <div className="absolute left-1/2 top-[18px] h-[44px] w-[56px] -translate-x-[8%] rotate-[18deg] rounded-[50%_50%_55%_45%] border-[12px] border-[var(--modo-beige)] border-l-transparent" />
      </div>
    </div>
  )
}

export default function GiftClaimPage() {
  const navigate = useNavigate()
  const { token } = useParams()
  const [gift, setGift] = useState(null)
  const [claimedPass, setClaimedPass] = useState(null)
  const [opened, setOpened] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadGift() {
      try {
        const data = await previewGift(token)
        setGift(data.gift)
      } catch (err) {
        setError(err?.response?.data?.message || 'Este regalo no está disponible.')
      } finally {
        setLoading(false)
      }
    }

    loadGift()
  }, [token])

  const giftValue = useMemo(() => {
    if (!gift) return ''
    return gift.unitType === 'MONEY'
      ? formatMoney(gift.initialAmount, gift.currency)
      : `${gift.initialUnits} consumos`
  }, [gift])

  function openGift() {
    setOpened(true)
    window.setTimeout(() => setShowForm(true), 650)
  }

  async function handleClaim(event) {
    event.preventDefault()
    try {
      setLoading(true)
      setError('')
      const data = await claimGift(token, form)
      setClaimedPass(data.pass)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo activar tu regalo.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !gift && !claimedPass) {
    return <div className="grid min-h-screen place-items-center bg-[var(--modo-cream)] font-black text-[var(--modo-brown)]">Preparando tu regalo…</div>
  }

  return (
    <main className="min-h-screen px-2.5 py-3 sm:px-5 sm:py-8">
      <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[26px] bg-white shadow-[0_24px_60px_rgba(69,44,28,.13)] ring-1 ring-black/5">
        <header className="bg-[var(--modo-card)] px-5 py-5 text-white sm:px-7 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <img src="/modo-cafe-logo.jpg" alt="Modo Café" className="h-14 w-[104px] rounded-xl bg-white object-contain px-2" />
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-white/55">Gift Pass</span>
          </div>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[.24em] text-white/50">Modo Café · regalo</p>
          <h1 className="mt-1 text-[clamp(1.8rem,8vw,2.5rem)] font-black leading-tight">Tenés un regalo 🎁</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
            {gift?.purchaserName ? `De parte de ${gift.purchaserName}. ` : ''}Abrilo y descubrí lo que te espera en Modo Café.
          </p>
        </header>

        <section className="p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {claimedPass ? (
            <div className="text-center">
              <GiftBox open confetti />
              <div className="-mt-2">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--modo-red)]">Regalo activado</p>
                <h2 className="mt-1 text-2xl font-black">¡Ya es tuyo, {claimedPass.client?.name?.split(' ')[0]}!</h2>
                <p className="mt-2 text-sm text-black/50">Tu Gift Pass quedó asociado a tu número de teléfono.</p>
              </div>

              <div className="modo-premium-card mt-5 p-5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">{claimedPass.product?.name}</p>
                    <p className="mt-2 text-3xl font-black">
                      {claimedPass.unitType === 'MONEY'
                        ? formatMoney(claimedPass.remainingAmount, claimedPass.product?.currency)
                        : `${claimedPass.remainingUnits} consumos`}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--modo-red)] px-3 py-1 text-[10px] font-black">ACTIVO</span>
                </div>
                <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-white/45">Para usarlo, ingresá a Mi Pase con tu teléfono. El QR de caja será dinámico y se renovará automáticamente.</p>
              </div>

              <button
                onClick={() => navigate(`/acceso?phone=${encodeURIComponent(claimedPass.client?.phone || form.phone)}`)}
                className="modo-btn-primary mt-5 w-full px-4 py-4"
              >
                IR A MI PASE
              </button>
            </div>
          ) : gift ? (
            <>
              {!opened ? (
                <div className="py-3 text-center">
                  <GiftBox />
                  <h2 className="mt-1 text-2xl font-black">Hay algo para vos</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/50">Tocá el botón y abrí tu regalo de Modo Café.</p>
                  <button onClick={openGift} className="modo-btn-primary mt-5 w-full px-4 py-4">ABRIR MI REGALO</button>
                </div>
              ) : (
                <div>
                  <GiftBox open confetti={showForm} />

                  <div className={`transition-all duration-500 ${showForm ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <div className="rounded-[22px] bg-[var(--modo-cream)] p-4 text-center ring-1 ring-black/5">
                      <p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--modo-red)]">Tu regalo</p>
                      <p className="mt-1 text-3xl font-black text-[var(--modo-ink)]">{giftValue}</p>
                      <p className="mt-2 text-sm text-black/50">{gift.description}</p>
                    </div>

                    <form onSubmit={handleClaim} className="mt-5 space-y-3">
                      <div>
                        <label className="text-sm font-black">Tu nombre</label>
                        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="modo-input mt-1.5" placeholder="Juan Pérez" />
                      </div>
                      <div>
                        <label className="text-sm font-black">Tu teléfono</label>
                        <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="modo-input mt-1.5" placeholder="0981 123 456" inputMode="tel" />
                      </div>
                      <div>
                        <label className="text-sm font-black">Email <span className="font-medium text-black/35">(opcional)</span></label>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="modo-input mt-1.5" placeholder="juan@email.com" />
                      </div>

                      <button disabled={loading} className="modo-btn-primary mt-2 w-full px-4 py-4 disabled:opacity-50">
                        {loading ? 'ACTIVANDO…' : 'ACTIVAR MI REGALO'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </main>
  )
}
