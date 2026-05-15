import { useCallback, useEffect, useState } from 'react'

export const sinkIdSupported = typeof HTMLAudioElement !== 'undefined' &&
  typeof HTMLAudioElement.prototype.setSinkId === 'function'

export function useAudioDevices() {
  const [inputDevices, setInputDevices] = useState([])
  const [outputDevices, setOutputDevices] = useState([])
  const [inputDeviceId, setInputDeviceId] = useState('')
  const [outputDeviceId, setOutputDeviceId] = useState('')

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      setInputDevices(all.filter((d) => d.kind === 'audioinput'))
      setOutputDevices(all.filter((d) => d.kind === 'audiooutput'))
    } catch {}
  }, [])

  useEffect(() => {
    async function init() {
      // Request mic permission once so enumerateDevices returns real labels.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((t) => t.stop())
      } catch {}
      refreshDevices()
    }
    init()
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', refreshDevices)
  }, [refreshDevices])

  return {
    inputDevices,
    outputDevices,
    inputDeviceId,
    setInputDeviceId,
    outputDeviceId,
    setOutputDeviceId,
    sinkIdSupported,
  }
}
