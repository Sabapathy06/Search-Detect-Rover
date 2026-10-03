export const PRIORITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export const PRIORITY_META = {
  CRITICAL: { label: 'Critical', className: 'critical', order: 0 },
  HIGH: { label: 'High', className: 'high', order: 1 },
  MEDIUM: { label: 'Medium', className: 'medium', order: 2 },
  LOW: { label: 'Low', className: 'low', order: 3 },
}

export function normalizePriority(level) {
  const value = String(level || 'MEDIUM').toUpperCase()
  return PRIORITY_META[value] ? value : 'MEDIUM'
}

export function groupByPriority(persons) {
  const groups = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] }
  for (const person of persons) {
    const level = normalizePriority(person.priority_level)
    groups[level].push(person)
  }
  return groups
}

export function sortPersons(persons) {
  return [...persons].sort((a, b) => {
    const aLevel = PRIORITY_META[normalizePriority(a.priority_level)].order
    const bLevel = PRIORITY_META[normalizePriority(b.priority_level)].order
    if (aLevel !== bLevel) return aLevel - bLevel
    return (a.priority || 0) - (b.priority || 0)
  })
}
