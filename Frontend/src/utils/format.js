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
  return person?.image_url || person?.image_path || '/static/placeholder.svg'
}
