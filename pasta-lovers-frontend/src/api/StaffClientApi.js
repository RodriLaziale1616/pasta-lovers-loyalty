import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

export async function getClientByTokenForStaff(token, authToken) {
  const { data } = await api.get(`/clients/staff/by-token/${token}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
  return data
}

export async function checkinClient(clientId, authToken) {
  const { data } = await api.post(
    `/clients/${clientId}/checkin`,
    {},
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  )
  return data
}

export async function redeemClient(clientId, authToken) {
  const { data } = await api.post(
    `/clients/${clientId}/redeem`,
    {},
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  )
  return data
}