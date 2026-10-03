import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

export function useBackendHealth(pollMs = 8000) {
  const [online, setOnline] = useState(false)
  const [status, setStatus] = useState(null)
  const [missionLog, setMissionLog] = useState([])
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      await api.health()
      setOnline(true)
      setError('')
      const [statusPayload, logPayload] = await Promise.all([api.status(), api.missionLog()])
      setStatus(statusPayload)
      setMissionLog(logPayload.events || [])
    } catch (err) {
      setOnline(false)
      setStatus(null)
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, pollMs)
    return () => window.clearInterval(interval)
  }, [refresh, pollMs])

  return { online, status, missionLog, error, refresh }
}
