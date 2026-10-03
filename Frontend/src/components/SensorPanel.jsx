export default function SensorPanel({ systemStatus, batteryLevel }) {
  const sensors = [
    { label: 'Ultrasonic', value: systemStatus?.ultrasonic?.value != null ? `${systemStatus.ultrasonic.value} m` : 'N/A' },
    { label: 'Thermal', value: systemStatus?.thermal?.value != null ? `${systemStatus.thermal.value}°C` : 'N/A' },
    { label: 'IMU', value: systemStatus?.imu?.status === 'not_connected' ? 'N/A' : systemStatus?.imu?.status || 'N/A' },
    { label: 'GPS', value: systemStatus?.gps?.locked ? 'Locked' : 'N/A' },
    { label: 'Battery', value: `${batteryLevel}%` },
    { label: 'Motor Status', value: systemStatus?.motors?.status === 'not_connected' ? 'N/A' : systemStatus?.motors?.status || 'N/A' },
    { label: 'ESP32-CAM', value: systemStatus?.esp32_cam?.status === 'not_connected' ? 'Not connected' : systemStatus?.esp32_cam?.status || 'Not connected' },
  ]

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Modular Sensors</p>
          <h2>Sensor Panel</h2>
        </div>
      </div>
      <div className="sensor-grid">
        {sensors.map((sensor) => (
          <article key={sensor.label} className="sensor-card">
            <span>{sensor.label}</span>
            <strong>{sensor.value}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}
