import { History } from 'lucide-react'

export default function MissionLog({ events, loading }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Operations Timeline</p>
          <h2>Mission Log</h2>
        </div>
        <div className="panel-badge"><History size={16} /> Event history</div>
      </div>
      {loading ? <p className="loading-text">Loading mission log...</p> : null}
      <div className="mission-log">
        {events.length ? events.map((event) => (
          <article key={`${event.timestamp}-${event.message}`} className={`log-item level-${(event.level || 'info').toLowerCase()}`}>
            <time>{event.time}</time>
            <p>{event.message}</p>
            <span>{event.date}</span>
          </article>
        )) : (
          <p className="empty-state">No mission events recorded yet.</p>
        )}
      </div>
    </section>
  )
}
