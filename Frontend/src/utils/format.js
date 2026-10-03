import { BASE_URL } from '../api/client'

export function formatConfidence(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A'
  }
  return `${Math.round(Number(value))}%`
}

export function displayPersonName(person) {
  return person?.name && person.name !== person?.filename ? person.name : 'Unknown Person'
}

export function personImageUrl(person) {
  const url = person?.image_url || person?.image_path || '/static/placeholder.svg'
  return url.startsWith('/') ? `${BASE_URL}${url}` : url
}
