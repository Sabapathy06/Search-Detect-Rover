import { AlertTriangle, Radio, Users } from 'lucide-react'

export default function DashboardOverview({ stats, backendOnline }) {
  const cards = [
    { label: 'Total Detected', value: stats?.total_detected ?? 0, tone: 'info' },
    { label: 'Critical', value: stats?.critical ?? 0, tone: 'critical' },
    { label: 'High Priority', value: stats?.high ?? 0, tone: 'high' },
    { label: 'Medium', value: stats?.medium ?? 0, tone: 'medium' },
    { label: 'Low', value: stats?.low ?? 0, tone: 'low' },
    { label: 'Rover Status', value: backendOnline ? 'Online' : 'Offline', tone: backendOnline ? 'success' : 'critical' },
  ]

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Overview</p>
          <h2>Command Dashboard</h2>
        </div>
        <div className="panel-badge">
          <Users size={16} />
          Live statistics
        </div>
      </div>
      <div className="stats-grid overview-grid">
        {cards.map((card) => (
          <article key={card.label} className={`stat-card tone-${card.tone}`}>
            <span className="stat-label">{card.label}</span>
            <strong className="stat-value">{card.value}</strong>
          </article>
        ))}
      </div>
      <div className="overview-notes">
        <p><AlertTriangle size={14} /> Priority counts update automatically from detected persons.</p>
        <p><Radio size={14} /> Rover telemetry displays only when hardware is connected.</p>
      </div>
    </section>
  )
}
