import { useEffect, useState } from 'react'
import { getAllRecordings, deleteRecording } from '../lib/db'
import WaveformPlayer from './WaveformPlayer'

function formatTime(secs) {
  if (!secs) return '0:00'
  const m = Math.floor(secs / 60)
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function RecordingList({ refreshKey }) {
  const [recordings, setRecordings] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getAllRecordings().then((recs) =>
      setRecordings([...recs].sort((a, b) => b.createdAt - a.createdAt))
    )
  }, [refreshKey])

  async function handleDelete(id) {
    await deleteRecording(id)
    setRecordings((prev) => prev.filter((r) => r.id !== id))
    if (expanded === id) setExpanded(null)
  }

  if (recordings.length === 0) {
    return (
      <p className="text-center text-gray-700 text-sm py-8">
        No recordings yet — hit record to start.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2 w-full max-w-lg mx-auto">
      {recordings.map((rec) => (
        <li key={rec.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
              className="flex-1 min-w-0 text-left"
            >
              <p className="text-sm font-medium text-white truncate">{rec.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatDate(rec.createdAt)}
                {' · '}
                {formatTime(rec.duration)}
                {rec.bpm ? ` · ${rec.bpm} BPM · ${rec.timeSignature?.label ?? ''}` : ''}
              </p>
            </button>

            <button
              onClick={() => handleDelete(rec.id)}
              className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-gray-800 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors"
              aria-label="Delete recording"
            >
              <TrashIcon />
            </button>
          </div>

          {expanded === rec.id && (
            <div className="px-4 pb-4">
              <WaveformPlayer
                blob={rec.blob}
                height={56}
                beatMarkers={
                  rec.bpm
                    ? { bpm: rec.bpm, timeSignature: rec.timeSignature }
                    : null
                }
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}
