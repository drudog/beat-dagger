import { openDB } from 'idb'

const DB_NAME = 'music-recorder'
const STORE = 'recordings'
let dbPromise

const PRESETS_STORE = 'metronome-presets'

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        }
        if (oldVersion < 3) {
          db.createObjectStore(PRESETS_STORE, { keyPath: 'id', autoIncrement: true })
        }
      },
    })
  }
  return dbPromise
}

// Safari cannot store Blob objects in IndexedDB — convert to ArrayBuffer first.
function blobToArrayBuffer(blob) {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.readAsArrayBuffer(blob)
  })
}

export async function saveRecording(blob, name, duration, beatMeta = null) {
  const db = await getDb()
  const buffer = await blobToArrayBuffer(blob)
  return db.add(STORE, {
    name,
    buffer,
    mimeType: blob.type || 'audio/mp4',
    duration,
    createdAt: Date.now(),
    bpm: beatMeta?.bpm ?? null,
    timeSignature: beatMeta?.timeSignature ?? null,
    beatPattern: beatMeta?.beatPattern ?? null,
  })
}

export async function getAllRecordings() {
  const db = await getDb()
  const rows = await db.getAll(STORE)
  // Reconstruct Blob from ArrayBuffer (new format), or keep legacy blob field.
  return rows.map((r) => ({
    ...r,
    blob: r.buffer
      ? new Blob([r.buffer], { type: r.mimeType || 'audio/mp4' })
      : r.blob,
  }))
}

export async function deleteRecording(id) {
  const db = await getDb()
  return db.delete(STORE, id)
}

export async function saveMetronomePreset(preset) {
  const db = await getDb()
  return db.add(PRESETS_STORE, { ...preset, createdAt: Date.now() })
}

export async function getMetronomePresets() {
  const db = await getDb()
  return db.getAll(PRESETS_STORE)
}

export async function deleteMetronomePreset(id) {
  const db = await getDb()
  return db.delete(PRESETS_STORE, id)
}
