import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { requestClientOtp, verifyClientOtp } from '../api/clientAuthApi'
import { getClientSessionToken, saveClientSessionToken } from '../utils/clientSession'

export default function ClientAccessPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [phone, setPhone] = useState(params.get('phone') || '')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('phone')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (getClientSessionToken()) navigate('/mi-pase', { replace: true })
  }, [navigate])

  async function handleRequest(event) {
    event.preventDefault()
    try {
      setLoading(true)
      setError('')
      const data = await requestClientOtp(phone)
      setMessage(data.message || 'Te enviamos un código.')
      setStep('code')
    } catch (err) {
      setError(err?.response?.data?.message || 'No pudimos enviar el código.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(event) {
    event.preventDefault()
    try {
      setLoading(true)
      setError('')
      const data = await verifyClientOtp(phone, code)
      saveClientSessionToken(data.token)
      navigate('/mi-pase', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'No pudimos validar el código.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-3 py-5 sm:px-5 sm:py-10">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-[26px] bg-white shadow-[0_20px_50px_rgba(69,44,28,.12)] ring-1 ring-black/5">
        <div className="bg-[var(--modo-card)] px-5 py-6 text-white sm:px-7">
          <img
            src="/modo-cafe-logo.jpg"
            alt="Modo Café"
            className="h-16 w-auto rounded-xl bg-white object-contain px-2 py-1"
          />
          <p className="mt-5 text-[11px] font-black uppercase tracking-[.22em] text-white/55">Tu cuenta Modo Café</p>
          <h1 className="mt-1 text-3xl font-black">Entrá a tus pases</h1>
          <p className="mt-2 text-sm leading-6 text-white/65">Sin contraseña. Usamos tu teléfono y un código de verificación.</p>
        </div>

        <div className="p-5 sm:p-7">
          {error && <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">{error}</div>}
          {message && !error && <div className="mb-4 rounded-2xl bg-[var(--modo-cream)] px-4 py-3 text-sm font-semibold text-[var(--modo-brown)]">{message}</div>}

          {step === 'phone' ? (
            <form onSubmit={handleRequest}>
              <label className="text-sm font-black">Número de teléfono</label>
              <input
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                placeholder="0981 123 456"
                className="modo-input mt-2"
              />
              <button disabled={loading} className="modo-btn-primary mt-4 w-full px-4 py-3.5 disabled:opacity-50">
                {loading ? 'ENVIANDO…' : 'RECIBIR CÓDIGO'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-[var(--modo-cream)] px-4 py-3">
                <div>
                  <p className="text-xs text-black/45">Código enviado a</p>
                  <p className="font-black">{phone}</p>
                </div>
                <button type="button" onClick={() => { setStep('phone'); setCode(''); setMessage('') }} className="text-xs font-black text-[var(--modo-red)]">CAMBIAR</button>
              </div>
              <label className="text-sm font-black">Código de 6 dígitos</label>
              <input
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="modo-input mt-2 text-center text-2xl font-black tracking-[.3em]"
              />
              <button disabled={loading || code.length !== 6} className="modo-btn-primary mt-4 w-full px-4 py-3.5 disabled:opacity-50">
                {loading ? 'VALIDANDO…' : 'ENTRAR A MI PASE'}
              </button>
              <button type="button" disabled={loading} onClick={handleRequest} className="mt-3 w-full py-2 text-sm font-bold text-[var(--modo-brown)]">Reenviar código</button>
            </form>
          )}

          <p className="mt-6 text-center text-xs leading-5 text-black/40">Tu saldo nunca se guarda en el teléfono. Cada pase se valida directamente con Modo Café.</p>
        </div>
      </div>
    </main>
  )
}
