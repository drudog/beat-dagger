import { useState } from 'react'
import { SOUNDS, DEFAULT_SUBS, makeDefaultRow } from '../hooks/useMetronome'

// Per-sound color palettes (inline style values to avoid Tailwind purge on dynamic keys)
const PALETTE = {
  click:     { accent: '#6366f1', normal: '#3730a3', ghost: '#1e1b4b', mute: '#111318', pill: '#4338ca', text: '#a5b4fc' },
  softClick: { accent: '#3b82f6', normal: '#1d4ed8', ghost: '#172554', mute: '#111318', pill: '#1e40af', text: '#93c5fd' },
  woodblock: { accent: '#f59e0b', normal: '#b45309', ghost: '#451a03', mute: '#111318', pill: '#92400e', text: '#fcd34d' },
  beep:      { accent: '#14b8a6', normal: '#0f766e', ghost: '#042f2e', mute: '#111318', pill: '#115e59', text: '#5eead4' },
  shaker:    { accent: '#f43f5e', normal: '#9f1239', ghost: '#4c0519', mute: '#111318', pill: '#881337', text: '#fda4af' },
}

const SOUND_LABELS = { click: 'Click', softClick: 'Soft', woodblock: 'Wood', beep: 'Beep', shaker: 'Shake' }
const LEVELS = ['accent', 'normal', 'ghost', 'mute']
const COUNT_IN_OPTIONS = [0, 1, 2, 4]

function nextSound(s) {
  return SOUNDS[(SOUNDS.indexOf(s) + 1) % SOUNDS.length]
}
function nextLevel(l, isFirstBeat = false) {
  const cycle = isFirstBeat ? ['accent', 'normal', 'ghost'] : LEVELS
  return cycle[(cycle.indexOf(l) + 1) % cycle.length]
}

// ─── Beat block ────────────────────────────────────────────────────────────────

function BeatBlock({ sound, step, beatIndex, isActive, isFirstBeat, onCycle, onSubCycle, onToggleSub }) {
  const p = PALETTE[sound] ?? PALETTE.click

  const blockBg = (level) => ({ backgroundColor: p[level] ?? p.mute })

  return (
    <div
      className="relative flex-1 min-w-0 h-12 rounded-lg overflow-hidden group select-none"
      style={{
        outline: isActive ? `2px solid rgba(255,255,255,0.75)` : '2px solid transparent',
        outlineOffset: '1px',
        transition: 'outline-color 80ms',
      }}
    >
      {step.subs ? (
        /* Subdivided: 4 equal segments */
        <div className="flex h-full gap-px">
          {/* Segment 1 = main beat */}
          <div
            className="flex-1 cursor-pointer transition-[background-color] duration-75"
            style={blockBg(step.level)}
            onClick={onCycle}
          />
          {step.subs.map((subLevel, k) => (
            <div
              key={k}
              className="flex-1 cursor-pointer transition-[background-color] duration-75"
              style={blockBg(subLevel)}
              onClick={() => onSubCycle(k, nextLevel(subLevel))}
            />
          ))}
        </div>
      ) : (
        /* Solid block */
        <div
          className="w-full h-full cursor-pointer transition-[background-color] duration-75"
          style={blockBg(step.level)}
          onClick={onCycle}
        />
      )}

      {/* Beat number */}
      <span
        className="absolute bottom-1 left-1.5 text-[9px] font-mono pointer-events-none select-none"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        {beatIndex + 1}
      </span>

      {/* Subdivide toggle — visible on hover */}
      <button
        className="absolute top-1 right-1 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: 'rgba(0,0,0,0.45)',
          color: step.subs ? p.text : 'rgba(255,255,255,0.5)',
        }}
        onClick={(e) => { e.stopPropagation(); onToggleSub() }}
        title={step.subs ? 'Remove subdivisions' : 'Subdivide into 4'}
      >
        ÷
      </button>
    </div>
  )
}

// ─── Row ───────────────────────────────────────────────────────────────────────

function SequencerRow({ row, currentBeat, isRunning, onUpdateStep, onSetRowSound, onRemoveRow, canDelete }) {
  const p = PALETTE[row.sound] ?? PALETTE.click

  function handleCycle(i) {
    const level = nextLevel(row.steps[i].level, i === 0)
    onUpdateStep(row.id, i, { level })
  }

  function handleSubCycle(beatIdx, subIdx, level) {
    const subs = [...(row.steps[beatIdx].subs ?? DEFAULT_SUBS)]
    subs[subIdx] = level
    onUpdateStep(row.id, beatIdx, { subs })
  }

  function handleToggleSub(i) {
    const step = row.steps[i]
    onUpdateStep(row.id, i, { subs: step.subs ? null : [...DEFAULT_SUBS] })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Sound pill */}
      <button
        onClick={() => onSetRowSound(row.id, nextSound(row.sound))}
        className="flex-shrink-0 w-14 h-8 rounded-lg text-xs font-semibold transition-colors"
        style={{ background: p.pill, color: p.text }}
        title="Click to change sound"
      >
        {SOUND_LABELS[row.sound]}
      </button>

      {/* Beat blocks */}
      <div className="flex flex-1 gap-1.5 min-w-0">
        {row.steps.map((step, i) => (
          <BeatBlock
            key={i}
            sound={row.sound}
            step={step}
            beatIndex={i}
            isActive={isRunning && currentBeat === i}
            isFirstBeat={i === 0}
            onCycle={() => handleCycle(i)}
            onSubCycle={(k, level) => handleSubCycle(i, k, level)}
            onToggleSub={() => handleToggleSub(i)}
          />
        ))}
      </div>

      {/* Delete row */}
      {canDelete ? (
        <button
          onClick={() => onRemoveRow(row.id)}
          className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors"
          title="Remove row"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : (
        <div className="w-6 flex-shrink-0" />
      )}
    </div>
  )
}

// ─── Panel ─────────────────────────────────────────────────────────────────────

export default function MetronomePanel({
  bpm, onBpmChange,
  timeSignature, onTimeSigChange,
  rows, onUpdateStep, onAddRow, onRemoveRow, onSetRowSound,
  volume, onVolumeChange,
  countInBars, onCountInBarsChange,
  autoStart, onAutoStartChange,
  isRunning, currentBeat,
  onToggle, onTapTempo,
  TIME_SIGNATURES,
}) {
  const [open, setOpen] = useState(false)

  function handleBpmInput(e) {
    const v = parseInt(e.target.value, 10)
    if (!isNaN(v)) onBpmChange(Math.min(300, Math.max(20, v)))
  }

  // Pick next unused sound when adding a row (fallback to click)
  function handleAddRow() {
    const used = new Set(rows.map((r) => r.sound))
    const next = SOUNDS.find((s) => !used.has(s)) ?? 'click'
    onAddRow(next)
  }

  return (
    <div className="w-full border border-gray-800 rounded-2xl overflow-hidden bg-gray-950">

      {/* ── Collapsed header ── */}
      <div className="flex items-center px-4 py-3 gap-3">
        {/* Live beat dots */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {rows[0]?.steps.map((step, i) => {
            const isActive = isRunning && currentBeat === i
            const p = PALETTE[rows[0].sound] ?? PALETTE.click
            return (
              <span
                key={i}
                className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-75"
                style={{
                  backgroundColor: isActive
                    ? p.accent
                    : step.level === 'mute' ? '#1f2937'
                    : step.level === 'ghost' ? '#374151'
                    : i === 0 ? p.normal : '#374151',
                  transform: isActive ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            )
          })}
        </div>

        <span className="text-sm font-mono text-gray-400 flex-shrink-0">{bpm} BPM</span>

        <button
          onClick={onToggle}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isRunning ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
          }`}
          aria-label={isRunning ? 'Stop metronome' : 'Start metronome'}
        >
          {isRunning ? <StopIcon /> : <PlayIcon />}
        </button>

        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ChevronIcon open={open} />
        </button>
      </div>

      {/* ── Expanded settings ── */}
      {open && (
        <div className="flex flex-col gap-4 border-t border-gray-800 px-4 pt-4 pb-5">

          {/* BPM */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-14 flex-shrink-0">BPM</span>
            <input
              type="range" min={20} max={300} value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
            <input
              type="number" min={20} max={300} value={bpm}
              onChange={handleBpmInput}
              className="w-14 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-indigo-500"
            />
            <button
              onPointerDown={onTapTempo}
              className="flex-shrink-0 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 font-medium select-none transition-colors"
            >
              TAP
            </button>
          </div>

          {/* Time signature */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-14 flex-shrink-0">Time</span>
            <div className="flex gap-1.5 flex-wrap">
              {TIME_SIGNATURES.map((ts) => (
                <button
                  key={ts.label}
                  onClick={() => onTimeSigChange(ts)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    timeSignature.label === ts.label
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  {ts.label}
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-14 flex-shrink-0">Volume</span>
            <input
              type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs text-gray-500 w-8 text-right">{Math.round(volume * 100)}%</span>
          </div>

          {/* ── Step sequencer grid ── */}
          <div className="flex flex-col gap-2 pt-1">
            {rows.map((row) => (
              <SequencerRow
                key={row.id}
                row={row}
                currentBeat={currentBeat}
                isRunning={isRunning}
                onUpdateStep={onUpdateStep}
                onSetRowSound={onSetRowSound}
                onRemoveRow={onRemoveRow}
                canDelete={rows.length > 1}
              />
            ))}

            {/* Add row */}
            {rows.length < 4 && (
              <button
                onClick={handleAddRow}
                className="flex items-center gap-2 mt-1 text-xs text-gray-600 hover:text-gray-400 transition-colors self-start"
              >
                <span className="w-14 h-8 rounded-lg border border-dashed border-gray-700 hover:border-gray-500 flex items-center justify-center text-lg leading-none transition-colors">
                  +
                </span>
                <span>Add sound</span>
              </button>
            )}
          </div>

          {/* Legend */}
          <p className="text-[10px] text-gray-700 -mt-1">
            Click block to cycle level · Hover block for ÷ to subdivide · Click sound pill to change
          </p>

          <div className="border-t border-gray-800 pt-3 flex flex-col gap-3">
            {/* Count-in */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-14 flex-shrink-0">Count-in</span>
              <div className="flex gap-1.5">
                {COUNT_IN_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => onCountInBarsChange(n)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      countInBars === n
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    }`}
                  >
                    {n === 0 ? 'Off' : `${n} bar${n > 1 ? 's' : ''}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-start */}
            <div className="flex items-center gap-3">
              <div className="w-14 flex-shrink-0" />
              <button
                onClick={() => onAutoStartChange(!autoStart)}
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${autoStart ? 'bg-indigo-600' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoStart ? 'translate-x-4' : ''}`} />
              </button>
              <span className="text-xs text-gray-400 select-none">Auto-start with recording</span>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

function PlayIcon() {
  return <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
}
function StopIcon() {
  return <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
}
function ChevronIcon({ open }) {
  return (
    <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
