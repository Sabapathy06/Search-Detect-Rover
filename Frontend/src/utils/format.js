export function formatConfidence(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A'
  }
  return `${Math.round(Number(value))}%`
}

export function displayPersonName(person) {
  return person?.name && person.name !== person?.filename ? person.name : 'Unknown Person'
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://search-detect-rover-1.onrender.com' : '')

export function personImageUrl(person) {
  const url = person?.image_url || person?.image_path || '/static/placeholder.svg'
  return url.startsWith('/') ? `${BASE_URL}${url}` : url
}
