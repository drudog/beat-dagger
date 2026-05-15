import { useState, useEffect, useCallback } from 'react'
import { useRecorder } from '../hooks/useRecorder'
import { useMetronome } from '../hooks/useMetronome'
import { saveRecording, saveMetronomePreset, getMetronomePresets, deleteMetronomePreset } from '../lib/db'
import WaveformPlayer from './WaveformPlayer'
import MetronomePanel from './MetronomePanel'

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function Recorder({ onSaved, inputDeviceId = '', outputDeviceId = '' }) {
  const {
    recState, setRecState,
    audioBlob, duration, levels,
    preAcquireStream, start, stop, discard,
  } = useRecorder()

  const metronome = useMetronome()

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [countingIn, setCountingIn] = useState(false)
  const [countInBeat, setCountInBeat] = useState(0)
  const [presets, setPresets] = useState([])

  useEffect(() => {
    getMetronomePresets().then(setPresets).catch((err) => console.error('Failed to load presets:', err))
  }, [])

  useEffect(() => {
    metronome.setOutputDevice(outputDeviceId)
  }, [outputDeviceId])

  const handleSavePreset = useCallback(async (presetName) => {
    const preset = {
      name: presetName.trim() || `Preset — ${new Date().toLocaleString()}`,
      bpm: metronome.bpm,
      timeSignature: metronome.timeSignature,
      rows: metronome.rows.map(({ sound, steps }) => ({ sound, steps })),
      volume: metronome.volume,
      countInBars: metronome.countInBars,
      autoStart: metronome.autoStart,
    }
    await saveMetronomePreset(preset)
    const updated = await getMetronomePresets()
    setPresets(updated)
  }, [metronome])

  const handleLoadPreset = useCallback((preset) => {
    metronome.setBpm(preset.bpm)
    metronome.setTimeSignature(preset.timeSignature)
    metronome.setRows(preset.rows.map((r) => ({
      ...r,
      id: Math.random().toString(36).slice(2),
    })))
    metronome.setVolume(preset.volume)
    metronome.setCountInBars(preset.countInBars)
    metronome.setAutoStart(preset.autoStart)
  }, [metronome])

  const handleDeletePreset = useCallback(async (id) => {
    await deleteMetronomePreset(id)
    setPresets((prev) => prev.filter((p) => p.id !== id))
  }, [])

  async function handleStart() {
    setError(null)
    try {
      if (metronome.autoStart && metronome.countInBars > 0) {
        // Pre-warm mic before count-in begins so recording starts precisely on beat 1
        const stream = await preAcquireStream(inputDeviceId)
        setCountingIn(true)
        setCountInBeat(0)

        metronome.startCountIn(metronome.countInBars, async () => {
          setCountingIn(false)
          await start(stream)
        })
      } else {
        if (metronome.autoStart) metronome.toggle()
        await start(null, inputDeviceId)
      }
    } catch {
      setError('Microphone access denied. Please allow access and try again.')
      setCountingIn(false)
      metronome.stopAll()
    }
  }

  function handleStop() {
    stop()
    // Leave metronome running — user stops it manually
  }

  function handleDiscard() {
    discard()
    setCountingIn(false)
    if (metronome.autoStart) metronome.stopAll()
  }

  async function handleSave() {
    setSaving(true)
    const title = name.trim() || `Recording — ${new Date().toLocaleString()}`
    const beatMeta = metronome.isRunning || metronome.autoStart
      ? { bpm: metronome.bpm, timeSignature: metronome.timeSignature }
      : null
    await saveRecording(audioBlob, title, duration, beatMeta)
    setSaving(false)
    setName('')
    discard()
    onSaved?.()
  }

  const isActive = recState === 'recording' || countingIn

  return (
    <div className="flex flex-col items-center gap-6 py-10">

      {/* Metronome panel */}
      <div className="w-full max-w-lg">
        <MetronomePanel
          bpm={metronome.bpm} onBpmChange={metronome.setBpm}
          timeSignature={metronome.timeSignature} onTimeSigChange={metronome.setTimeSignature}
          rows={metronome.rows}
          onUpdateStep={metronome.updateStep}
          onAddRow={metronome.addRow}
          onRemoveRow={metronome.removeRow}
          onSetRowSound={metronome.setRowSound}
          volume={metronome.volume} onVolumeChange={metronome.setVolume}
          countInBars={metronome.countInBars} onCountInBarsChange={metronome.setCountInBars}
          autoStart={metronome.autoStart} onAutoStartChange={metronome.setAutoStart}
          isRunning={metronome.isRunning}
          currentBeat={metronome.currentBeat}
          onToggle={metronome.toggle}
          onTapTempo={metronome.tapTempo}
          TIME_SIGNATURES={metronome.TIME_SIGNATURES}
          presets={presets}
          onSavePreset={handleSavePreset}
          onLoadPreset={handleLoadPreset}
          onDeletePreset={handleDeletePreset}
        />
      </div>

      {/* Live level meter */}
      <div
        className="flex items-end gap-px h-14 transition-opacity duration-500"
        style={{ opacity: recState === 'recording' ? 1 : 0 }}
        aria-hidden="true"
      >
        {levels.map((lvl, i) => (
          <div
            key={i}
            className="w-2.5 rounded-sm bg-gradient-to-t from-indigo-600 to-violet-400 transition-[height] duration-75"
            style={{ height: `${Math.max(6, lvl * 100)}%` }}
          />
        ))}
      </div>

      {/* Timer / count-in display */}
      {countingIn ? (
        <div className="flex flex-col items-center gap-1">
          <p className="text-gray-500 text-xs uppercase tracking-widest">Get ready…</p>
          <div className="font-mono text-5xl font-bold tabular-nums tracking-widest text-amber-400">
            {formatTime(0)}
          </div>
        </div>
      ) : (
        <div
          className={`font-mono text-6xl font-bold tabular-nums tracking-widest select-none transition-colors duration-300 ${
            recState === 'recording' ? 'text-red-400' : 'text-gray-800'
          }`}
        >
          {formatTime(duration)}
        </div>
      )}

      {/* Record / Stop button */}
      {recState !== 'recorded' && !countingIn && (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={recState === 'idle' ? handleStart : handleStop}
            className="relative flex items-center justify-center focus:outline-none group"
            aria-label={recState === 'idle' ? 'Start recording' : 'Stop recording'}
          >
            {recState === 'recording' && (
              <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping" />
            )}
            <span
              className={`flex items-center justify-center shadow-xl transition-all duration-200 ${
                recState === 'recording'
                  ? 'w-20 h-20 rounded-2xl bg-red-600 hover:bg-red-500'
                  : 'w-28 h-28 rounded-full bg-red-600 hover:bg-red-500 group-hover:scale-105'
              }`}
            >
              {recState === 'idle' ? <MicIcon /> : <StopIcon />}
            </span>
          </button>

          <p className={`text-sm font-medium transition-colors duration-200 ${
            recState === 'recording' ? 'text-red-400 animate-pulse' : 'text-gray-600'
          }`}>
            {recState === 'idle'
              ? metronome.autoStart && metronome.countInBars > 0
                ? `Tap to count in (${metronome.countInBars} bar${metronome.countInBars > 1 ? 's' : ''})`
                : 'Tap to record'
              : 'Recording…'}
          </p>

          {error && (
            <p className="text-xs text-red-500 max-w-xs text-center">{error}</p>
          )}
        </div>
      )}

      {/* Count-in: show pulsing indicator instead of record button */}
      {countingIn && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full border-2 border-amber-500 animate-ping opacity-60" />
          <p className="text-amber-400 text-sm font-medium">Count-in…</p>
          <button
            onClick={() => { setCountingIn(false); metronome.stopAll() }}
            className="text-xs text-gray-600 hover:text-gray-400"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Post-recording card */}
      {recState === 'recorded' && audioBlob && (
        <div className="w-full max-w-lg flex flex-col gap-3">
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <WaveformPlayer
              blob={audioBlob}
              height={72}
              outputDeviceId={outputDeviceId}
              beatMarkers={
                (metronome.isRunning || metronome.autoStart)
                  ? { bpm: metronome.bpm, timeSignature: metronome.timeSignature }
                  : null
              }
            />
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder={`Recording — ${new Date().toLocaleString()}`}
            className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
            autoFocus
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : 'Save recording'}
            </button>
            <button
              onClick={handleDiscard}
              className="px-5 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-400 hover:text-white text-sm font-medium py-3 rounded-xl transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  )
}
