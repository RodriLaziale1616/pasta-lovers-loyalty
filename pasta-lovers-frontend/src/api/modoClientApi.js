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

export async function registerModoClient(payload, token) {
  const { data } = await api.post('/clients/staff/register', payload, authConfig(token))
  return data
}

export async function listClientPasses(clientId, token) {
  const { data } = await api.get(`/clients/${clientId}/passes`, authConfig(token))
  return data
}
