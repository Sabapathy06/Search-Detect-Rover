import { PRIORITY_LEVELS, PRIORITY_META, groupByPriority } from '../utils/priority'
import { displayPersonName, personImageUrl } from '../utils/format'

export default function PriorityQueue({ persons, onView, onPriorityChange }) {
  const groups = groupByPriority(persons)

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Rescue Operations</p>
          <h2>Priority Queue</h2>
        </div>
      </div>
      <div className="priority-queue">
        {PRIORITY_LEVELS.map((level) => (
          <div key={level} className="queue-group">
            <h3 className={`queue-heading ${PRIORITY_META[level].className}`}>{level}</h3>
            {groups[level].length ? (
              groups[level].map((person) => (
                <button
                  key={person.person_id}
                  type="button"
                  className="queue-item"
                  onClick={() => onView(person)}
                >
                  <img src={personImageUrl(person)} alt="" />
                  <div>
                    <strong>{person.person_id}</strong>
                    <span>{displayPersonName(person)}</span>
                  </div>
                  <select
                    className="priority-select compact"
                    value={level}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onPriorityChange(person, event.target.value)}
                  >
                    {PRIORITY_LEVELS.map((option) => (
                      <option key={option} value={option}>{PRIORITY_META[option].label}</option>
                    ))}
                  </select>
                </button>
              ))
            ) : (
              <p className="empty-inline">No persons in this band.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
