import { useEffect, useState } from 'react'
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser'
import {
  deleteClientPasskey,
  getPasskeyRegistrationOptions,
  listClientPasskeys,
  verifyPasskeyRegistration,
} from '../api/clientAuthApi'

function accessLabel(passkey) {
  if (passkey?.label) return passkey.label
  return passkey?.backedUp ? 'Passkey sincronizada' : 'Acceso seguro'
}

export default function PasskeyManager({ token }) {
  const [supported, setSupported] = useState(false)
  const [passkeys, setPasskeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setSupported(browserSupportsWebAuthn())

    async function load() {
      try {
        const data = await listClientPasskeys(token)
        setPasskeys(data.passkeys || [])
      } catch {
        // El resto de Mi Pase puede seguir funcionando aunque falle esta sección.
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token])

  async function registerPasskey() {
    try {
      setRegistering(true)
      setError('')
      setMessage('')
      const begin = await getPasskeyRegistrationOptions(token)
      const response = await startRegistration({ optionsJSON: begin.options })
      const data = await verifyPasskeyRegistration(response, token, 'Huella / Face ID')
      setPasskeys((current) => [data.passkey, ...current])
      setMessage('Listo. La próxima vez podés entrar con huella, Face ID o el desbloqueo de tu dispositivo.')
    } catch (err) {
      if (err?.name === 'InvalidStateError') {
        setError('Este acceso ya estaba registrado en el dispositivo.')
      } else if (err?.name === 'NotAllowedError') {
        setError('La activación fue cancelada o el dispositivo no pudo verificarte.')
      } else {
        setError(err?.response?.data?.message || err?.message || 'No pudimos activar el acceso rápido.')
      }
    } finally {
      setRegistering(false)
    }
  }

  async function removePasskey(id) {
    if (!window.confirm('¿Eliminar este acceso rápido? Vas a poder seguir entrando con código OTP.')) return
    try {
      setError('')
      await deleteClientPasskey(id, token)
      setPasskeys((current) => current.filter((item) => item.id !== id))
      setMessage('Acceso eliminado. El ingreso con código sigue disponible.')
    } catch (err) {
      setError(err?.response?.data?.message || 'No pudimos eliminar este acceso.')
    }
  }

  if (loading) return null

  return (
    <section className="modo-card mb-4 overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--modo-red)] text-xl text-white">🔐</div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--modo-red)]">Acceso rápido</p>
            <h2 className="mt-1 text-lg font-black text-[var(--modo-brown)]">Huella, Face ID o desbloqueo</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-black/50">
              Tu biometría queda en el teléfono. Modo Café guarda solamente una clave pública que permite comprobar que sos vos.
            </p>
          </div>
        </div>

        {supported ? (
          <button
            type="button"
            onClick={registerPasskey}
            disabled={registering}
            className="modo-btn-primary shrink-0 px-4 py-3 text-sm disabled:opacity-50"
          >
            {registering ? 'ACTIVANDO…' : passkeys.length ? '+ AGREGAR OTRO ACCESO' : 'ACTIVAR ACCESO RÁPIDO'}
          </button>
        ) : (
          <span className="shrink-0 rounded-xl bg-[var(--modo-cream)] px-3 py-2 text-xs font-bold text-black/45">No disponible en este navegador</span>
        )}
      </div>

      {(message || error || passkeys.length > 0) && (
        <div className="border-t border-black/5 px-4 py-4 sm:px-5">
          {message && <div className="mb-3 rounded-xl bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-800">{message}</div>}
          {error && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">{error}</div>}

          {passkeys.length > 0 && (
            <div className="space-y-2">
              {passkeys.map((passkey) => (
                <div key={passkey.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--modo-cream)] px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--modo-brown)]">{accessLabel(passkey)}</p>
                    <p className="mt-0.5 text-[11px] text-black/45">
                      Activado el {new Date(passkey.createdAt).toLocaleDateString('es-PY')}
                      {passkey.lastUsedAt ? ` · último uso ${new Date(passkey.lastUsedAt).toLocaleDateString('es-PY')}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePasskey(passkey.id)}
                    className="shrink-0 rounded-xl px-3 py-2 text-xs font-black text-[var(--modo-red)] hover:bg-red-50"
                  >
                    ELIMINAR
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
