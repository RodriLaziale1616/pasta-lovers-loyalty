import { useEffect, useState } from 'react'
import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getPasskeyAuthenticationOptions,
  requestClientOtp,
  verifyClientOtp,
  verifyPasskeyAuthentication,
} from '../api/clientAuthApi'
import { getClientSessionToken, saveClientSessionToken } from '../utils/clientSession'

export default function ClientAccessPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [phone, setPhone] = useState(params.get('phone') || '')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('phone')
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (getClientSessionToken()) {
      navigate('/mi-pase', { replace: true })
      return
    }
    setPasskeySupported(browserSupportsWebAuthn())
  }, [navigate])

  async function handleRequest(event) {
    event?.preventDefault?.()
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

  async function handlePasskeyLogin() {
    if (!phone.trim()) {
      setError('Ingresá primero tu número de teléfono.')
      return
    }

    try {
      setPasskeyLoading(true)
      setError('')
      setMessage('')
      const begin = await getPasskeyAuthenticationOptions(phone)
      const response = await startAuthentication({ optionsJSON: begin.options })
      const data = await verifyPasskeyAuthentication(phone, response)
      saveClientSessionToken(data.token)
      navigate('/mi-pase', { replace: true })
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setError('El acceso rápido fue cancelado o no pudo verificarse en este dispositivo.')
      } else {
        setError(err?.response?.data?.message || err?.message || 'No pudimos usar el acceso biométrico.')
      }
    } finally {
      setPasskeyLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-3 py-5 sm:px-5 sm:py-10">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-[26px] bg-white shadow-[0_20px_50px_rgba(69,44,28,.12)] ring-1 ring-black/5">
        <div className="border-b border-[var(--modo-red)]/10 bg-[var(--modo-cream)] px-5 py-6 sm:px-7">
          <img
            src="/modo-cafe-logo.jpg"
            alt="Modo Café"
            className="h-16 w-auto object-contain mix-blend-multiply"
          />
          <p className="mt-5 text-[11px] font-black uppercase tracking-[.22em] text-[var(--modo-red)]">Tu cuenta Modo Café</p>
          <h1 className="mt-1 text-3xl font-black text-[var(--modo-brown)]">Entrá a tus pases</h1>
          <p className="mt-2 text-sm leading-6 text-black/55">Usá tu acceso rápido o recibí un código en tu teléfono.</p>
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
                autoComplete="tel webauthn"
                placeholder="0981 123 456"
                className="modo-input mt-2"
              />

              {passkeySupported && (
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={passkeyLoading || loading}
                  className="modo-btn-primary mt-4 w-full px-4 py-3.5 disabled:opacity-50"
                >
                  {passkeyLoading ? 'VERIFICANDO…' : '🔐 ENTRAR CON HUELLA / FACE ID'}
                </button>
              )}

              {passkeySupported && (
                <div className="my-4 flex items-center gap-3 text-[11px] font-black uppercase tracking-[.15em] text-black/30">
                  <span className="h-px flex-1 bg-black/10" />
                  o con código
                  <span className="h-px flex-1 bg-black/10" />
                </div>
              )}

              <button disabled={loading || passkeyLoading} className="w-full rounded-[15px] bg-[var(--modo-beige)] px-4 py-3.5 font-black text-[var(--modo-brown)] disabled:opacity-50">
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

          <p className="mt-6 text-center text-xs leading-5 text-black/40">Modo Café nunca recibe tu huella ni tu Face ID. El dispositivo solo confirma que sos vos.</p>
        </div>
      </div>
    </main>
  )
}
