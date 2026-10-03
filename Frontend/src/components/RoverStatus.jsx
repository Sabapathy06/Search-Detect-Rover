import { Activity, Battery, Camera, Cpu, MapPin, Radio, Server, Thermometer, Waves } from 'lucide-react'

function StatusRow({ icon: Icon, label, value, tone = 'neutral' }) {
  return (
    <div className={`status-row tone-${tone}`}>
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default function RoverStatus({ systemStatus, backendOnline, cameraConnected, batteryLevel }) {
  const toneFor = (status) => {
    if (!status || status === 'not_connected' || status === 'offline') return 'neutral'
    if (status === 'online' || status === 'connected') return 'success'
    return 'info'
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Telemetry</p>
          <h2>Rover Status</h2>
        </div>
      </div>
      <div className="status-list">
        <StatusRow icon={Radio} label="Rover" value={backendOnline && cameraConnected ? 'Online' : 'Offline'} tone={backendOnline && cameraConnected ? 'success' : 'critical'} />
        <StatusRow icon={Battery} label="Battery" value={`${batteryLevel}%`} tone={batteryLevel > 25 ? 'info' : 'critical'} />
        <StatusRow icon={MapPin} label="GPS" value={systemStatus?.gps?.locked ? 'Locked' : 'Not connected'} tone={toneFor(systemStatus?.gps?.status)} />
        <StatusRow icon={Camera} label="Camera" value={cameraConnected ? 'Online' : 'Offline'} tone={cameraConnected ? 'success' : 'critical'} />
        <StatusRow icon={Server} label="Backend" value={backendOnline ? 'Connected' : 'Offline'} tone={backendOnline ? 'success' : 'critical'} />
        <StatusRow icon={Activity} label="Motors" value={systemStatus?.motors?.status === 'not_connected' ? 'Not connected' : systemStatus?.motors?.status || 'Not connected'} />
        <StatusRow icon={Cpu} label="IMU" value={systemStatus?.imu?.status === 'not_connected' ? 'Not connected' : systemStatus?.imu?.status || 'Not connected'} />
        <StatusRow icon={Waves} label="Ultrasonic" value={systemStatus?.ultrasonic?.value != null ? `${systemStatus.ultrasonic.value} m` : 'N/A'} />
        <StatusRow icon={Thermometer} label="Thermal" value={systemStatus?.thermal?.value != null ? `${systemStatus.thermal.value}°C` : 'N/A'} />
      </div>
    </section>
  )
}
