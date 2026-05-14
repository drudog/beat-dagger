import { useRef, useState, useCallback } from 'react'

const BAR_COUNT = 24

export function useRecorder() {
  const [recState, setRecState] = useState('idle') // idle | recording | recorded
  const [audioBlob, setAudioBlob] = useState(null)
  const [duration, setDuration] = useState(0)
  const [levels, setLevels] = useState(Array(BAR_COUNT).fill(0))

  const mrRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const audioCtxRef = useRef(null)
  const animRef = useRef(null)
  const timerRef = useRef(null)
  const durationRef = useRef(0)

  const stopLevelMonitor = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    setLevels(Array(BAR_COUNT).fill(0))
  }, [])

  const startLevelMonitor = useCallback((stream) => {
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    source.connect(analyser)
    audioCtxRef.current = ctx

    const data = new Uint8Array(analyser.frequencyBinCount)
    const step = Math.floor(data.length / BAR_COUNT)

    function tick() {
      analyser.getByteFrequencyData(data)
      const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
        const slice = data.slice(i * step, (i + 1) * step)
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length
        return avg / 255
      })
      setLevels(bars)
      animRef.current = requestAnimationFrame(tick)
    }
    tick()
  }, [])

  // preAcquireStream: call before count-in so getUserMedia latency doesn't delay beat 1
  const preAcquireStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    return stream
  }, [])

  const start = useCallback(async (preAcquiredStream) => {
    const stream = preAcquiredStream ?? await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    const mr = new MediaRecorder(stream)
    mrRef.current = mr
    chunksRef.current = []

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setAudioBlob(blob)
      setRecState('recorded')
    }

    mr.start(100)
    durationRef.current = 0
    setDuration(0)
    setRecState('recording')
    startLevelMonitor(stream)

    timerRef.current = setInterval(() => {
      durationRef.current += 1
      setDuration(durationRef.current)
    }, 1000)
  }, [startLevelMonitor])

  const stop = useCallback(() => {
    clearInterval(timerRef.current)
    stopLevelMonitor()
    mrRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [stopLevelMonitor])

  const discard = useCallback(() => {
    setAudioBlob(null)
    setDuration(0)
    durationRef.current = 0
    setRecState('idle')
  }, [])

  return {
    recState, setRecState,
    audioBlob,
    duration,
    levels,
    preAcquireStream,
    start,
    stop,
    discard,
  }
}
