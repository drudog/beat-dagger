import { useRef, useState, useCallback, useEffect } from 'react'

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD = 0.15
const VOL_MAP = { accent: 1.0, normal: 0.6, ghost: 0.25, mute: 0 }

export const TIME_SIGNATURES = [
  { label: '2/4', beats: 2, subdivision: 4 },
  { label: '3/4', beats: 3, subdivision: 4 },
  { label: '4/4', beats: 4, subdivision: 4 },
  { label: '5/4', beats: 5, subdivision: 4 },
  { label: '6/8', beats: 6, subdivision: 8 },
  { label: '7/8', beats: 7, subdivision: 8 },
]

export const SOUNDS = ['click', 'softClick', 'woodblock', 'beep', 'shaker']
export const DEFAULT_SUBS = ['ghost', 'ghost', 'ghost']

function uid() { return Math.random().toString(36).slice(2) }

function makeStep(isFirst) {
  return { level: isFirst ? 'accent' : 'normal', subs: null }
}

export function makeDefaultRow(sound, beats) {
  return {
    id: uid(),
    sound,
    steps: Array.from({ length: beats }, (_, i) => makeStep(i === 0)),
  }
}

// --- Synthesis ---

function synthesizeClick(ctx, out, time, isAccent, vol) {
  const osc = ctx.createOscillator(), g = ctx.createGain()
  osc.connect(g); g.connect(out)
  osc.type = 'sine'
  osc.frequency.value = isAccent ? 1000 : 800
  g.gain.setValueAtTime(vol, time)
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.03)
  osc.start(time); osc.stop(time + 0.03)
}

function synthesizeSoftClick(ctx, out, time, isAccent, vol) {
  const osc = ctx.createOscillator(), g = ctx.createGain()
  osc.connect(g); g.connect(out)
  osc.type = 'sine'
  osc.frequency.value = isAccent ? 400 : 300
  g.gain.setValueAtTime(vol * 0.4, time)
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.08)
  osc.start(time); osc.stop(time + 0.08)
}

function synthesizeWoodblock(ctx, out, time, isAccent, vol) {
  const osc = ctx.createOscillator()
  const filter = ctx.createBiquadFilter()
  const g = ctx.createGain()
  osc.type = 'square'; osc.frequency.value = isAccent ? 500 : 400
  filter.type = 'bandpass'; filter.frequency.value = 900; filter.Q.value = 2
  osc.connect(filter); filter.connect(g); g.connect(out)
  g.gain.setValueAtTime(vol * 0.8, time)
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.04)
  osc.start(time); osc.stop(time + 0.04)
}

function synthesizeBeep(ctx, out, time, isAccent, vol) {
  const osc = ctx.createOscillator(), g = ctx.createGain()
  osc.connect(g); g.connect(out)
  osc.type = 'sine'
  osc.frequency.value = isAccent ? 880 : 660
  g.gain.setValueAtTime(vol * 0.5, time)
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.06)
  osc.start(time); osc.stop(time + 0.06)
}

function synthesizeShaker(ctx, out, time, isAccent, vol) {
  const duration = 0.07
  const bufSize = Math.ceil(ctx.sampleRate * duration)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const src = ctx.createBufferSource()
  src.buffer = buf

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = isAccent ? 6000 : 5000
  filter.Q.value = 1.5

  const g = ctx.createGain()
  g.gain.setValueAtTime(0, time)
  g.gain.linearRampToValueAtTime(vol * (isAccent ? 0.9 : 0.55), time + 0.005)
  g.gain.exponentialRampToValueAtTime(0.001, time + duration)

  src.connect(filter); filter.connect(g); g.connect(out)
  src.start(time); src.stop(time + duration)
}

const SYNTHS = { click: synthesizeClick, softClick: synthesizeSoftClick, woodblock: synthesizeWoodblock, beep: synthesizeBeep, shaker: synthesizeShaker }

function fire(ctx, out, time, level, sound) {
  if (level === 'mute') return
  const vol = VOL_MAP[level] ?? 0.6
  ;(SYNTHS[sound] ?? SYNTHS.click)(ctx, out, time, level === 'accent', vol)
}

// --- Hook ---

export function useMetronome() {
  const [bpm, setBpmState] = useState(120)
  const [timeSignature, setTimeSigState] = useState(TIME_SIGNATURES[2])
  const [rows, setRowsState] = useState(() => [
    makeDefaultRow('click', 4),
    {
      id: uid(), sound: 'shaker',
      steps: [
        { level: 'accent', subs: ['ghost', 'ghost', 'ghost'] },
        { level: 'normal', subs: ['ghost', 'ghost', 'ghost'] },
        { level: 'normal', subs: ['ghost', 'ghost', 'ghost'] },
        { level: 'normal', subs: ['ghost', 'ghost', 'ghost'] },
      ],
    },
    {
      id: uid(), sound: 'woodblock',
      steps: [
        { level: 'normal', subs: null },
        { level: 'normal', subs: null },
        { level: 'accent', subs: null },
        { level: 'normal', subs: null },
      ],
    },
  ])
  const [volume, setVolumeState] = useState(0.8)
  const [countInBars, setCountInBars] = useState(1)
  const [autoStart, setAutoStart] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(-1)

  const audioCtxRef = useRef(null)
  const masterGainRef = useRef(null)
  const outputSinkIdRef = useRef('')
  const schedulerRef = useRef(null)
  const rafRef = useRef(null)
  const nextBeatTimeRef = useRef(0)
  const currentBeatRef = useRef(0)
  const bpmRef = useRef(bpm)
  const beatsRef = useRef(timeSignature.beats)
  const rowsRef = useRef(rows)
  const volumeRef = useRef(volume)
  const isRunningRef = useRef(false)
  const countingInRef = useRef(false)
  const countInBeatsLeftRef = useRef(0)
  const onCountInCompleteRef = useRef(null)
  const tapTimesRef = useRef([])

  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { beatsRef.current = timeSignature.beats }, [timeSignature])
  useEffect(() => { rowsRef.current = rows }, [rows])
  useEffect(() => {
    volumeRef.current = volume
    if (masterGainRef.current) masterGainRef.current.gain.value = volume
  }, [volume])

  // Synchronous — must stay sync so new AudioContext() and resume() are called
  // directly within the user gesture call stack (Safari requirement).
  function getAudioCtx() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx
      const g = ctx.createGain()
      g.gain.value = volumeRef.current
      g.connect(ctx.destination)
      masterGainRef.current = g
      if (outputSinkIdRef.current && typeof ctx.setSinkId === 'function') {
        ctx.setSinkId(outputSinkIdRef.current).catch(() => {})
      }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }

  // Async — waits for the context to actually be running.
  // Used by scheduleLoop (runs from setTimeout, outside user gesture).
  async function waitForRunning() {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }
    return ctx
  }

  function scheduleBeat(beatIndex, time) {
    const ctx = audioCtxRef.current
    const out = masterGainRef.current
    const spb = 60 / bpmRef.current

    for (const row of rowsRef.current) {
      const step = row.steps[beatIndex % row.steps.length]
      if (!step) continue
      fire(ctx, out, time, step.level, row.sound)
      if (step.subs) {
        step.subs.forEach((subLevel, k) => {
          fire(ctx, out, time + spb * (k + 1) / 4, subLevel, row.sound)
        })
      }
    }
  }

  async function scheduleLoop() {
    const ctx = await waitForRunning()
    if (ctx.state !== 'running') {
      schedulerRef.current = setTimeout(scheduleLoop, LOOKAHEAD_MS)
      return
    }
    if (nextBeatTimeRef.current < ctx.currentTime) {
      nextBeatTimeRef.current = ctx.currentTime + 0.05
    }
    while (nextBeatTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD) {
      const beat = currentBeatRef.current % beatsRef.current
      scheduleBeat(beat, nextBeatTimeRef.current)

      if (countingInRef.current) {
        countInBeatsLeftRef.current -= 1
        if (countInBeatsLeftRef.current <= 0) {
          countingInRef.current = false
          const cb = onCountInCompleteRef.current
          onCountInCompleteRef.current = null
          const delay = Math.max(0, (nextBeatTimeRef.current - ctx.currentTime) * 1000)
          setTimeout(() => cb?.(), delay)
        }
      }

      nextBeatTimeRef.current += 60 / bpmRef.current
      currentBeatRef.current += 1
    }
    schedulerRef.current = setTimeout(scheduleLoop, LOOKAHEAD_MS)
  }

  function startVisualLoop() {
    function tick() {
      if (!isRunningRef.current) return
      const ctx = audioCtxRef.current
      if (ctx) {
        const spb = 60 / bpmRef.current
        const lastBeatTime = nextBeatTimeRef.current - spb
        const elapsed = ctx.currentTime - lastBeatTime
        if (elapsed >= 0 && elapsed < spb * 0.5) {
          const beat = ((currentBeatRef.current - 1) % beatsRef.current + beatsRef.current) % beatsRef.current
          setCurrentBeat(beat)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function startScheduler() {
    const ctx = getAudioCtx()
    currentBeatRef.current = 0
    nextBeatTimeRef.current = ctx.currentTime + 0.05
    isRunningRef.current = true
    setIsRunning(true)
    setCurrentBeat(0)
    scheduleLoop()
    startVisualLoop()
  }

  function stopScheduler() {
    clearTimeout(schedulerRef.current)
    cancelAnimationFrame(rafRef.current)
    isRunningRef.current = false
    countingInRef.current = false
    setIsRunning(false)
    setCurrentBeat(-1)
  }

  const toggle = useCallback(() => {
    isRunningRef.current ? stopScheduler() : startScheduler()
  }, [])

  const startCountIn = useCallback((bars, onComplete) => {
    const ctx = getAudioCtx()
    countingInRef.current = true
    countInBeatsLeftRef.current = bars * beatsRef.current
    onCountInCompleteRef.current = onComplete
    currentBeatRef.current = 0
    nextBeatTimeRef.current = ctx.currentTime + 0.05
    isRunningRef.current = true
    setIsRunning(true)
    setCurrentBeat(0)
    scheduleLoop()
    startVisualLoop()
  }, [])

  const stopAll = useCallback(() => {
    stopScheduler()
    onCountInCompleteRef.current = null
  }, [])

  const tapTempo = useCallback(() => {
    const now = performance.now()
    tapTimesRef.current.push(now)
    if (tapTimesRef.current.length > 4) tapTimesRef.current.shift()
    if (tapTimesRef.current.length >= 2) {
      const gaps = tapTimesRef.current.slice(1).map((t, i) => t - tapTimesRef.current[i])
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
      setBpm(Math.min(300, Math.max(20, Math.round(60000 / avg))))
    }
  }, [])

  const setBpm = useCallback((v) => { bpmRef.current = v; setBpmState(v) }, [])

  const setTimeSignature = useCallback((ts) => {
    beatsRef.current = ts.beats
    setTimeSigState(ts)
    const next = rowsRef.current.map((row) => ({
      ...row,
      steps: Array.from({ length: ts.beats }, (_, i) =>
        i < row.steps.length ? row.steps[i] : makeStep(false)
      ),
    }))
    rowsRef.current = next
    setRowsState(next)
  }, [])

  const setRows = useCallback((next) => {
    rowsRef.current = next
    setRowsState(next)
  }, [])

  const addRow = useCallback((sound) => {
    const next = [...rowsRef.current, makeDefaultRow(sound, beatsRef.current)]
    rowsRef.current = next
    setRowsState(next)
  }, [])

  const removeRow = useCallback((id) => {
    if (rowsRef.current.length <= 1) return
    const next = rowsRef.current.filter((r) => r.id !== id)
    rowsRef.current = next
    setRowsState(next)
  }, [])

  const setRowSound = useCallback((id, sound) => {
    const next = rowsRef.current.map((r) => r.id === id ? { ...r, sound } : r)
    rowsRef.current = next
    setRowsState(next)
  }, [])

  const updateStep = useCallback((rowId, beatIndex, patch) => {
    const next = rowsRef.current.map((r) =>
      r.id !== rowId ? r : {
        ...r,
        steps: r.steps.map((s, i) => i === beatIndex ? { ...s, ...patch } : s),
      }
    )
    rowsRef.current = next
    setRowsState(next)
  }, [])

  const setVolume = useCallback((v) => { volumeRef.current = v; setVolumeState(v) }, [])

  const setOutputDevice = useCallback((sinkId) => {
    outputSinkIdRef.current = sinkId
    const ctx = audioCtxRef.current
    if (ctx && typeof ctx.setSinkId === 'function') {
      ctx.setSinkId(sinkId || '').catch(() => {})
    }
  }, [])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
    }
    // Resume on any user interaction — covers Safari's strict gesture requirement
    // when returning from idle (visibilitychange alone isn't always enough).
    function handleInteraction() {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('click', handleInteraction)
    document.addEventListener('keydown', handleInteraction)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
    }
  }, [])

  useEffect(() => () => { stopScheduler(); audioCtxRef.current?.close() }, [])

  return {
    bpm, setBpm,
    timeSignature, setTimeSignature,
    rows, setRows, addRow, removeRow, setRowSound, updateStep,
    volume, setVolume,
    setOutputDevice,
    countInBars, setCountInBars,
    autoStart, setAutoStart,
    isRunning,
    currentBeat,
    toggle,
    startCountIn,
    stopAll,
    tapTempo,
    TIME_SIGNATURES,
  }
}
