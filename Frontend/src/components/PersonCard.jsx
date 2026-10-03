import { Check, Edit3, Eye, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { PRIORITY_META, normalizePriority } from '../utils/priority'
import { displayPersonName, formatConfidence, personImageUrl } from '../utils/format'

export default function PersonCard({ person, onView, onDelete, onPriorityChange, onNameChange, compact = false }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(person.name || '')
  const level = normalizePriority(person.priority_level)
  const meta = PRIORITY_META[level]

  return (
    <article className={`person-card ${compact ? 'compact' : ''}`}>
      <img src={personImageUrl(person)} alt={person.person_id} className="person-image" />
      <div className="person-body">
        <div className="person-id">{person.person_id}</div>
        {editing ? (
          <input
            className="priority-select person-name-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label={`Edit name for ${person.person_id}`}
          />
        ) : <div className="person-name">{displayPersonName(person)}</div>}
        <span className={`priority-pill ${meta.className}`}>{meta.label}</span>
        {!compact && (
          <>
            <div className="person-meta">Confidence: {formatConfidence(person.confidence)}</div>
            <div className="person-meta">Detected: {person.time} · {person.date}</div>
            <div className="person-meta">Source: {person.source || 'N/A'}</div>
            {person.ai_suggested_priority ? (
              <div className="person-meta">AI Suggested: {person.ai_suggested_priority}</div>
            ) : null}
          </>
        )}
      </div>
      <div className="person-actions">
        {editing ? (
          <>
            <button type="button" className="btn primary small" onClick={async () => {
              if (!name.trim()) return
              await onNameChange(person, name)
              setEditing(false)
            }}>
              <Check size={14} /> Save
            </button>
            <button type="button" className="btn ghost small" onClick={() => { setName(person.name || ''); setEditing(false) }}>
              <X size={14} /> Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn ghost small" onClick={() => onView(person)}>
              <Eye size={14} /> View
            </button>
            <button type="button" className="btn ghost small" onClick={() => setEditing(true)}>
              <Edit3 size={14} /> Edit
            </button>
          </>
        )}
        <select
          className="priority-select"
          value={level}
          onChange={(event) => onPriorityChange(person, event.target.value)}
          aria-label={`Change priority for ${person.person_id}`}
        >
          {Object.keys(PRIORITY_META).map((option) => (
            <option key={option} value={option}>{PRIORITY_META[option].label}</option>
          ))}
        </select>
        <button type="button" className="btn danger small" onClick={() => onDelete(person)}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </article>
  )
}
