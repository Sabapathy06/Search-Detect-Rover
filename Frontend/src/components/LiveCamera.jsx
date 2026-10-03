import { useEffect, useRef, useState } from 'react'
import { Camera, Scan, Square, Upload } from 'lucide-react'
import { api } from '../api/client'

const CAMERA_SOURCES = [
  { id: 'local', label: 'Local Webcam' },
  { id: 'backend', label: 'Backend Stream' },
]
const ESP32_CAPTURE_URL = 'http://10.150.210.156/capture'
const ESP32_DETECT_URL = 'http://10.150.210.156/detect'

export default function LiveCamera({ onCaptured, backendOnline, onCameraStateChange }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  const [source, setSource] = useState('local')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [lastDetection, setLastDetection] = useState(null)
  const [capturedImageUrl, setCapturedImageUrl] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [message, setMessage] = useState('Select a camera source and start the feed.')

  const updateCameraState = (active) => {
    onCameraStateChange?.(active)
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    setCameraReady(false)
    setDetecting(false)
    setMessage('Camera stopped.')
    updateCameraState(false)
  }

  const startLocalCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera API is not supported by this browser.')
      return
    }
    setCameraError('')
    setMessage('Starting local webcam...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
      setCameraReady(true)
      setMessage('Local webcam connected.')
      updateCameraState(true)
    } catch (error) {
      setCameraError(error.name === 'NotAllowedError' ? 'Camera permission denied.' : 'Camera failed to start.')
      setCameraActive(false)
      setCameraReady(false)
    }
  }

  const startCamera = async () => {
    if (source === 'backend') {
      setCameraError('')
      setCameraActive(true)
      setCameraReady(true)
      setMessage('Backend stream active.')
      updateCameraState(true)
      return
    }
    await startLocalCamera()
  }

  const captureFromElement = async (element, captureSource) => {
    const canvas = document.createElement('canvas')
    canvas.width = element.videoWidth || element.naturalWidth || 640
    canvas.height = element.videoHeight || element.naturalHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(element, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('Capture failed'))), 'image/jpeg', 0.92)
    })

    const formData = new FormData()
    formData.append('image', blob, 'capture.jpg')
    formData.append('file', blob, 'capture.jpg')
    formData.append('source', captureSource)

    const result = await api.createPerson(formData)
    setLastDetection(result)
    onCaptured?.()
    return result
  }

  const captureFromEsp32 = async () => {
    const response = await fetch(ESP32_CAPTURE_URL, { mode: 'cors', cache: 'no-store' })
    if (!response.ok) throw new Error('ESP32-CAM capture failed.')

    const blob = await response.blob()
    if (!blob.size) throw new Error('ESP32-CAM returned an empty image.')

    const formData = new FormData()
    formData.append('image', blob, 'capture.jpg')
    formData.append('file', blob, 'capture.jpg')
    formData.append('source', 'ESP32-CAM')

    const result = await api.createPerson(formData)
    const nextImageUrl = URL.createObjectURL(blob)
    setCapturedImageUrl(nextImageUrl)
    setLastDetection(result)
    onCaptured?.()
  }

  useEffect(() => {
    if (!detecting) return undefined

    let active = true
    const pollDetection = async () => {
      try {
        const response = await fetch(ESP32_DETECT_URL, { mode: 'cors', cache: 'no-store' })
        if (!response.ok) throw new Error('ESP32-CAM detection failed.')
        const result = await response.json()
        if (active) {
          setAiResult(result)
          setCameraError(result.error ? 'ESP32-CAM detection failed.' : '')
        }
      } catch (error) {
        if (active) setCameraError(error.message)
      }
    }

    pollDetection()
    const interval = window.setInterval(pollDetection, 1000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [detecting])

  useEffect(() => () => {
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl)
  }, [capturedImageUrl])

  const handleCapturePerson = async () => {
    if (!cameraReady) return
    setCapturing(true)
    setCameraError('')
    try {
      if (source === 'backend') {
        await captureFromEsp32()
      } else if (videoRef.current) {
        await captureFromElement(videoRef.current, 'Laptop Camera')
      }
      setMessage('Person captured and saved.')
    } catch (error) {
      setCameraError(error.message)
    } finally {
      setCapturing(false)
    }
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setCameraError('Unsupported image type. Use JPG, JPEG, PNG, or WEBP.')
      event.target.value = ''
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setCameraError('Image exceeds 10 MB limit.')
      event.target.value = ''
      return
    }

    setUploading(true)
    setCameraError('')
    try {
      const formData = new FormData()
      formData.append('image', file, file.name)
      formData.append('source', 'Manual Upload')
      const result = await api.createPerson(formData)
      setLastDetection(result)
      onCaptured?.()
      setMessage('Image uploaded successfully.')
    } catch (error) {
      setCameraError(error.message)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleSourceChange = (nextSource) => {
    stopCamera()
    setSource(nextSource)
    setMessage(nextSource === 'backend' ? 'Backend stream ready to start.' : 'Local webcam ready to start.')
  }

  return (
    <section className="panel camera-panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Live Feed</p>
          <h2>Live Camera</h2>
        </div>
        <div className="live-badge">{cameraActive ? 'LIVE' : 'STANDBY'}</div>
      </div>

      <div className="camera-source-row">
        {CAMERA_SOURCES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip-btn ${source === item.id ? 'active' : ''}`}
            onClick={() => handleSourceChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="camera-frame">
        {source === 'backend' ? (
          cameraActive ? (
            <img
              id="backend-stream-preview"
              src="http://10.150.210.156:81/stream"
              alt="Backend camera stream"
              className="camera-video"
            />
          ) : (
            <div className="camera-placeholder">
              <Camera size={42} />
              <p>Backend stream not started</p>
            </div>
          )
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
            {!cameraActive && (
              <div className="camera-placeholder">
                <Camera size={42} />
                <p>{cameraError || 'No camera active'}</p>
              </div>
            )}
          </>
        )}
      </div>

      <p className="camera-status-line">{message}</p>
      {cameraError ? <p className="error-text">{cameraError}</p> : null}

      <div className="camera-actions">
        <button type="button" className="btn primary" onClick={cameraActive ? stopCamera : startCamera} disabled={!backendOnline && source === 'backend'}>
          {cameraActive ? <><Square size={16} /> Stop Camera</> : <><Camera size={16} /> Start Camera</>}
        </button>
        <button type="button" className="btn secondary" onClick={handleCapturePerson} disabled={!cameraReady || capturing}>
          {capturing ? 'Capturing...' : 'Capture Person'}
        </button>
        <button type="button" className="btn secondary" onClick={() => setDetecting(true)} disabled={!cameraReady || detecting}>
          <Scan size={16} /> {detecting ? 'Detection Active' : 'Start Detection'}
        </button>
        <button type="button" className="btn ghost" onClick={() => setDetecting(false)} disabled={!detecting}>
          Stop Detection
        </button>
        <button type="button" className="btn secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Person Image'}
        </button>
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden onChange={handleUpload} />
      </div>

      {lastDetection ? (
        <div className="detection-banner">
          <strong>PERSON DETECTED</strong>
          {capturedImageUrl ? <img src={capturedImageUrl} alt="Captured person" className="camera-video" /> : null}
          <span>ID: {lastDetection.person_id}</span>
          <span>Confidence: {lastDetection.confidence != null ? `${Math.round(lastDetection.confidence)}%` : 'N/A'}</span>
          <span>Timestamp: {lastDetection.date} {lastDetection.time}</span>
        </div>
      ) : null}
      {aiResult ? (
        <div className="detection-banner">
          <strong>{aiResult.human ? 'HUMAN' : 'NOT HUMAN'}</strong>
          <span>Confidence: {aiResult.confidence != null ? `${Math.round(aiResult.confidence * 100)}%` : 'N/A'}</span>
        </div>
      ) : null}
    </section>
  )
}

export function isCameraConnected(source, cameraActive) {
  return cameraActive
}
