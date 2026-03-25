import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

export async function registerClient(payload) {
  const { data } = await api.post('/clients/register', payload)
  return data
}

export async function getClientCard(token) {
  const { data } = await api.get(`/clients/card/${token}`)
  return data
}