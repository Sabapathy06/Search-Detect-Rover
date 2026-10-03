import {
  Activity,
  Battery,
  Camera,
  MapPin,
  Radio,
  Server,
} from 'lucide-react'

function StatusChip({ label, value, tone = 'neutral' }) {
  return (
    <div className={`status-chip tone-${tone}`}>
      <span className="status-chip-label">{label}</span>
      <span className="status-chip-value">{value}</span>
    </div>
  )
}

export default function Header({ backendOnline, systemStatus, cameraConnected, batteryLevel }) {
  const roverOnline = backendOnline && cameraConnected
  const cameraStatus = cameraConnected ? 'Online' : 'Offline'
  const gpsStatus = systemStatus?.gps?.locked ? 'Active' : 'Not connected'

  return (
    <header className="command-header">
      <div className="header-brand">
        <p className="header-kicker">Disaster Response Command Center</p>
        <h1>SEARCH &amp; DETECT ROVER</h1>
      </div>
      <div className="header-status-grid">
        <StatusChip
          label="Rover"
          value={roverOnline ? 'Online' : 'Offline'}
          tone={roverOnline ? 'success' : 'critical'}
        />
        <StatusChip
          label="Camera"
          value={cameraStatus}
          tone={cameraStatus === 'Online' ? 'success' : 'warning'}
        />
        <StatusChip
          label="Backend"
          value={backendOnline ? 'Online' : 'Offline'}
          tone={backendOnline ? 'success' : 'critical'}
        />
        <StatusChip
          label="GPS"
          value={gpsStatus}
          tone={gpsStatus === 'Active' ? 'info' : 'neutral'}
        />
        <StatusChip
          label="Battery"
          value={`${batteryLevel}%`}
          tone={batteryLevel > 25 ? 'info' : 'critical'}
        />
      </div>
      <div className="header-icons" aria-hidden="true">
        <Radio size={18} />
        <Camera size={18} />
        <Server size={18} />
        <MapPin size={18} />
        <Battery size={18} />
        <Activity size={18} />
      </div>
    </header>
  )
}
