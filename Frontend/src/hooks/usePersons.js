import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

export function usePersons(pollMs = 5000) {
  const [persons, setPersons] = useState([])
  const [active, setActive] = useState([])
  const [rescued, setRescued] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const payload = await api.persons()
      setPersons(payload.persons || [])
      setActive(payload.active || [])
      setRescued(payload.rescued || [])
      setStats(payload.stats || null)
      setError('')
    } catch (err) {
      setError(err.message)
      if (!silent) {
        setPersons([])
        setActive([])
        setRescued([])
        setStats(null)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = window.setInterval(() => loadData(true), pollMs)
    return () => window.clearInterval(interval)
  }, [loadData, pollMs])

  return { persons, active, rescued, stats, loading, refreshing, error, reload: loadData }
}
