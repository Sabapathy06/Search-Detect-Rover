import { useEffect, useState } from 'react'

const CAMERA_BASE_URL = 'http://10.150.210.156/'
const CAMERA_CHECK_INTERVAL = 4000
const CAMERA_CHECK_TIMEOUT = 2000

export function useCameraHealth() {
  const [online, setOnline] = useState(false)

  useEffect(() => {
    let disposed = false

    const checkCamera = async () => {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), CAMERA_CHECK_TIMEOUT)

      try {
        await fetch(CAMERA_BASE_URL, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!disposed) setOnline(true)
      } catch {
        if (!disposed) setOnline(false)
      } finally {
        window.clearTimeout(timeout)
      }
    }

    checkCamera()
    const interval = window.setInterval(checkCamera, CAMERA_CHECK_INTERVAL)

    return () => {
      disposed = true
      window.clearInterval(interval)
    }
  }, [])

  return online
}