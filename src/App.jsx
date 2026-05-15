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
      <header className="border-b border-gray-900 px-6 py-4 flex items-center justify-center gap-1.5">
        <img src="/logo.png" alt="Beat Dagger" className="w-16 h-16" />
        <span className="font-light text-sm tracking-wide">Beat Dagger</span>
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
