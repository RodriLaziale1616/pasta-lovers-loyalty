import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

function authConfig(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

export async function requestClientOtp(phone) {
  const { data } = await api.post('/client-auth/request-otp', { phone })
  return data
}

export async function verifyClientOtp(phone, code) {
  const { data } = await api.post('/client-auth/verify-otp', { phone, code })
  return data
}

export async function getClientMe(token) {
  const { data } = await api.get('/client-auth/me', authConfig(token))
  return data
}

export async function logoutClient(token) {
  const { data } = await api.post('/client-auth/logout', {}, authConfig(token))
  return data
}

export async function createClientQr(publicId, token) {
  const { data } = await api.post('/client-auth/qr', { publicId }, authConfig(token))
  return data
}

export async function listClientPasskeys(token) {
  const { data } = await api.get('/client-auth/passkeys', authConfig(token))
  return data
}

export async function getPasskeyRegistrationOptions(token) {
  const { data } = await api.post('/client-auth/passkeys/register/options', {}, authConfig(token))
  return data
}

export async function verifyPasskeyRegistration(response, token, label = '') {
  const { data } = await api.post(
    '/client-auth/passkeys/register/verify',
    { response, label },
    authConfig(token),
  )
  return data
}

export async function getPasskeyAuthenticationOptions(phone) {
  const { data } = await api.post('/client-auth/passkeys/auth/options', { phone })
  return data
}

export async function verifyPasskeyAuthentication(phone, response) {
  const { data } = await api.post('/client-auth/passkeys/auth/verify', { phone, response })
  return data
}

export async function deleteClientPasskey(id, token) {
  const { data } = await api.delete(`/client-auth/passkeys/${encodeURIComponent(id)}`, authConfig(token))
  return data
}
