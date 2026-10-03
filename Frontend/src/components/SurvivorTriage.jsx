import { PRIORITY_LEVELS, PRIORITY_META, groupByPriority } from '../utils/priority'
import { displayPersonName } from '../utils/format'

export default function SurvivorTriage({ persons, onPriorityChange }) {
  const groups = groupByPriority(persons)

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Human-Supervised Triage</p>
          <h2>Survivor Triage Board</h2>
        </div>
      </div>
      <div className="triage-board">
        {PRIORITY_LEVELS.map((level) => (
          <div key={level} className={`triage-column ${PRIORITY_META[level].className}`}>
            <h3>{level}</h3>
            <div className="triage-list">
              {groups[level].length ? groups[level].map((person) => (
                <div key={person.person_id} className="triage-card">
                  <strong>{person.person_id}</strong>
                  <span>{displayPersonName(person)}</span>
                  <select
                    className="priority-select compact"
                    value={level}
                    onChange={(event) => onPriorityChange(person, event.target.value)}
                  >
                    {PRIORITY_LEVELS.map((option) => (
                      <option key={option} value={option}>{PRIORITY_META[option].label}</option>
                    ))}
                  </select>
                </div>
              )) : <p className="empty-inline">Empty</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
