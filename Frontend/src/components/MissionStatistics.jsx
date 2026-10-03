export default function MissionStatistics({ stats }) {
  const items = [
    ['Total Detected', stats?.total_detected ?? 0],
    ['Confirmed Persons', stats?.confirmed_persons ?? 0],
    ['Possible Persons', stats?.possible_persons ?? 0],
    ['False Detections', stats?.false_detections ?? 0],
    ['Critical', stats?.critical ?? 0],
    ['High', stats?.high ?? 0],
    ['Medium', stats?.medium ?? 0],
    ['Low', stats?.low ?? 0],
  ]

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Mission Analytics</p>
          <h2>Mission Statistics</h2>
        </div>
      </div>
      <div className="stats-grid compact-grid">
        {items.map(([label, value]) => (
          <article key={label} className="stat-card">
            <span className="stat-label">{label}</span>
            <strong className="stat-value">{value}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}
