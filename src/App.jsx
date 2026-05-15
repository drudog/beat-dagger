import { useState } from 'react'
import Recorder from './components/Recorder'
import RecordingList from './components/RecordingList'
import DeviceSelector from './components/DeviceSelector'
import { useAudioDevices } from './hooks/useAudioDevices'

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const devices = useAudioDevices()

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-900 px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </div>
        <span className="font-semibold text-sm tracking-wide">Beat Dagger</span>
      </header>

      {/* Device selector */}
      <DeviceSelector
        inputDevices={devices.inputDevices}
        outputDevices={devices.outputDevices}
        inputDeviceId={devices.inputDeviceId}
        onInputChange={devices.setInputDeviceId}
        outputDeviceId={devices.outputDeviceId}
        onOutputChange={devices.setOutputDeviceId}
        sinkIdSupported={devices.sinkIdSupported}
      />

      {/* Recorder */}
      <main className="flex-1 flex flex-col items-center px-4 py-2">
        <div className="w-full max-w-lg">
          <Recorder
            onSaved={() => setRefreshKey((k) => k + 1)}
            inputDeviceId={devices.inputDeviceId}
            outputDeviceId={devices.outputDeviceId}
          />
        </div>

        {/* Divider */}
        <div className="w-full max-w-lg border-t border-gray-900 mb-6" />

        {/* Recordings list */}
        <div className="w-full pb-12">
          <RecordingList refreshKey={refreshKey} outputDeviceId={devices.outputDeviceId} />
        </div>
      </main>
    </div>
  )
}
