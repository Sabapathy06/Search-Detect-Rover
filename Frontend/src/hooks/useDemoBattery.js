import { useEffect, useState } from 'react'

const STORAGE_KEY = 'search-detect-demo-battery'
const DECREASE_INTERVAL = 5 * 60 * 1000

function readBattery() {
  const saved = Number(localStorage.getItem(STORAGE_KEY))
  return Number.isFinite(saved) && saved >= 0 && saved <= 100 ? saved : 100
}

export function useDemoBattery() {
  const [batteryLevel, setBatteryLevel] = useState(readBattery)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setBatteryLevel((current) => {
        const next = Math.max(0, current - 1)
        localStorage.setItem(STORAGE_KEY, String(next))
        return next
      })
    }, DECREASE_INTERVAL)

    return () => window.clearInterval(interval)
  }, [])

  return batteryLevel
}