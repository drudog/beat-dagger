import { openDB } from 'idb'

const DB_NAME = 'music-recorder'
const STORE = 'recordings'
let dbPromise

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        }
        // v2: schemaless store — bpm/timeSignature/beatPattern added at write time
      },
    })
  }
  return dbPromise
}

export async function saveRecording(blob, name, duration, beatMeta = null) {
  const db = await getDb()
  return db.add(STORE, {
    name,
    blob,
    duration,
    createdAt: Date.now(),
    bpm: beatMeta?.bpm ?? null,
    timeSignature: beatMeta?.timeSignature ?? null,
    beatPattern: beatMeta?.beatPattern ?? null,
  })
}

export async function getAllRecordings() {
  const db = await getDb()
  return db.getAll(STORE)
}

export async function deleteRecording(id) {
  const db = await getDb()
  return db.delete(STORE, id)
}
