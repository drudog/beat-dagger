import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'

export default function WaveformPlayer({ blob, height = 64, beatMarkers = null, outputDeviceId = '' }) {
  const containerRef = useRef(null)
  const wsRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!ready || !wsRef.current) return
    wsRef.current.getMediaElement()?.setSinkId?.(outputDeviceId || '').catch?.(() => {})
  }, [ready, outputDeviceId])

  useEffect(() => {
    if (!blob || !containerRef.current) return

    const url = URL.createObjectURL(blob)
    let destroyed = false

    const init = async () => {
      // Always pre-decode so we can pass channelData to ws.load(), which routes through
      // Decoder.createBuffer() instead of Decoder.decode(). Decoder.decode() creates a
      // regular AudioContext that Safari starts suspended, causing decodeAudioData to hang
      // indefinitely — 'ready' never fires, waveform stays blank, play button stays disabled.
      // If pre-decode fails for any reason, [[0,0]] is a flat placeholder that still lets
      // WaveSurfer skip Decoder.decode() and fire 'ready' once loadedmetadata resolves.
      let channelData
      let decodedDuration
      try {
        const OffCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext
        const offlineCtx = new OffCtx(1, 1, 44100)
        // FileReader works on all Safari versions; Blob.arrayBuffer() needs Safari 14.1+
        const arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('FileReader failed'))
          reader.readAsArrayBuffer(blob)
        })
        // Callback form of decodeAudioData works on all Safari versions
        const audioBuffer = await new Promise((resolve, reject) =>
          offlineCtx.decodeAudioData(arrayBuffer, resolve, reject)
        )
        channelData = [audioBuffer.getChannelData(0)]
        decodedDuration = audioBuffer.duration
      } catch {
        // Flat placeholder — WaveSurfer gets real duration from loadedmetadata,
        // and Decoder.decode() (the hanging path) is still never reached.
        channelData = [[0, 0]]
      }

      if (destroyed) return

      const plugins = []
      let regions = null
      if (beatMarkers) {
        regions = RegionsPlugin.create()
        plugins.push(regions)
      }

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#4f46e5',
        progressColor: '#818cf8',
        cursorColor: '#c7d2fe',
        height,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
        plugins,
      })
      wsRef.current = ws

      ws.on('ready', (duration) => {
        setReady(true)
        if (beatMarkers && regions) {
          drawBeatMarkers(regions, beatMarkers, duration)
        }
      })
      ws.on('finish', () => setPlaying(false))

      ws.load(url, channelData, decodedDuration)
    }

    init()

    return () => {
      destroyed = true
      wsRef.current?.destroy()
      wsRef.current = null
      URL.revokeObjectURL(url)
      setPlaying(false)
      setReady(false)
    }
  }, [blob, height, beatMarkers])

  function togglePlay() {
    if (!wsRef.current || !ready) return
    wsRef.current.playPause()
    setPlaying((p) => !p)
  }

  return (
    <div className="flex items-center gap-3 w-full">
      <button
        onClick={togglePlay}
        disabled={!ready}
        className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 flex items-center justify-center transition-colors"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div ref={containerRef} className="flex-1 min-w-0" />
    </div>
  )
}

function drawBeatMarkers(regions, { bpm, timeSignature }, duration) {
  const spb = 60 / bpm
  const beats = timeSignature?.beats ?? 4
  let t = 0
  let i = 0
  while (t <= duration + spb) {
    const isDownbeat = i % beats === 0
    regions.addRegion({
      start: t,
      end: t,
      color: isDownbeat ? 'rgba(99, 102, 241, 0.85)' : 'rgba(156, 163, 175, 0.4)',
      drag: false,
      resize: false,
    })
    t += spb
    i++
  }
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}
