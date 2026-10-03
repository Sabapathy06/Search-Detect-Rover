import { Trash2, X } from 'lucide-react'
import { PRIORITY_META, normalizePriority } from '../utils/priority'
import { displayPersonName, formatConfidence, personImageUrl } from '../utils/format'

export default function PersonDetailsModal({ person, onClose, onDelete, onPriorityChange, busy }) {
  if (!person) return null

  const level = normalizePriority(person.priority_level)

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <img src={personImageUrl(person)} alt={person.person_id} className="modal-image" />
        <div className="modal-grid">
          <div><span>Person ID</span><strong>{person.person_id}</strong></div>
          <div><span>Name</span><strong>{displayPersonName(person)}</strong></div>
          <div><span>Priority</span><strong className={`priority-pill ${PRIORITY_META[level].className}`}>{PRIORITY_META[level].label}</strong></div>
          <div><span>Confidence</span><strong>{formatConfidence(person.confidence)}</strong></div>
          <div><span>Detection Date</span><strong>{person.date}</strong></div>
          <div><span>Detection Time</span><strong>{person.time}</strong></div>
          <div><span>Source</span><strong>{person.source || 'N/A'}</strong></div>
          <div><span>Status</span><strong>{person.status || 'Detected'}</strong></div>
          <div><span>Location</span><strong>{person.latitude != null && person.longitude != null ? `${person.latitude}, ${person.longitude}` : 'Not available'}</strong></div>
          {person.ai_suggested_priority ? (
            <div><span>AI Suggested</span><strong>{person.ai_suggested_priority}</strong></div>
          ) : null}
        </div>
        <div className="modal-actions">
          <select
            className="priority-select"
            value={level}
            disabled={busy}
            onChange={(event) => onPriorityChange(person, event.target.value)}
          >
            {Object.keys(PRIORITY_META).map((option) => (
              <option key={option} value={option}>{PRIORITY_META[option].label}</option>
            ))}
          </select>
          <button type="button" className="btn danger" disabled={busy} onClick={() => onDelete(person)}>
            <Trash2 size={16} /> Delete Person
          </button>
          <button type="button" className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
