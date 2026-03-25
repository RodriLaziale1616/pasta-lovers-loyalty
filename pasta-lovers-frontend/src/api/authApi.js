import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

export async function loginStaff(payload) {
  const { data } = await api.post('/auth/login', payload)
  return data
}

export async function getMe(token) {
  const { data } = await api.get('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return data
}