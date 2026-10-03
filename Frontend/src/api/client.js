const DEFAULT_ERROR = 'Unable to connect to rover backend.'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://search-detect-rover-1.onrender.com' : '')

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

async function request(url, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${url}`, options)
    const payload = await parseJson(response)
    if (!response.ok) {
      const detail = payload.detail || payload.message || DEFAULT_ERROR
      throw new Error(typeof detail === 'string' ? detail : DEFAULT_ERROR)
    }
    return payload
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error(DEFAULT_ERROR)
    }
    throw error
  }
}

export const api = {
  health: () => request('/health'),
  status: () => request('/api/status'),
  stats: () => request('/api/stats'),
  missionLog: () => request('/api/mission-log'),
  persons: () => request('/api/persons'),
  createPerson: (formData) => request('/api/persons', { method: 'POST', body: formData }),
  updatePersonName: (personId, name) =>
    request(`/api/persons/${encodeURIComponent(personId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  deletePerson: (id) => request(`/api/persons/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  deleteAllPersons: () => request('/api/persons', { method: 'DELETE' }),
  updatePriority: (personId, body) =>
    request(`/api/persons/${encodeURIComponent(personId)}/priority`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  rescuePerson: (personId, action = 'rescue') =>
    request(`/api/rescue/${encodeURIComponent(personId)}?action=${action}`, { method: 'POST' }),
}
