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
