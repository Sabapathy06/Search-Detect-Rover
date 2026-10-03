export default function AlertsPanel({ events }) {
  const alerts = events.slice(0, 8)

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Notifications</p>
          <h2>Alert System</h2>
        </div>
      </div>
      <div className="alerts-list">
        {alerts.length ? alerts.map((event) => {
          const level = (event.level || 'INFO').toUpperCase()
          const tone = level === 'CRITICAL' ? 'critical' : level === 'HIGH' ? 'warning' : 'info'
          return (
            <article key={`${event.timestamp}-${event.message}`} className={`alert-item ${tone}`}>
              <strong>{level}</strong>
              <p>{event.message}</p>
              <span>{event.time}</span>
            </article>
          )
        }) : (
          <p className="empty-state">No active alerts.</p>
        )}
      </div>
    </section>
  )
}
