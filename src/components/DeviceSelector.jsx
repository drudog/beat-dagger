import { useState } from 'react'

const selectClass = 'flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer'

function deviceLabel(device, fallback) {
  return device.label || fallback
}

export default function DeviceSelector({
  inputDevices, outputDevices,
  inputDeviceId, onInputChange,
  outputDeviceId, onOutputChange,
  sinkIdSupported,
}) {
  const [open, setOpen] = useState(false)

  const currentInput = inputDevices.find((d) => d.deviceId === inputDeviceId)
  const currentOutput = outputDevices.find((d) => d.deviceId === outputDeviceId)

  const inputSummary = inputDeviceId
    ? (currentInput?.label || 'Selected mic')
    : 'Default mic'
  const outputSummary = outputDeviceId
    ? (currentOutput?.label || 'Selected output')
    : 'Default output'

  return (
    <div className="w-full border-b border-gray-900">
      <div className="w-full max-w-lg mx-auto px-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 py-2.5 text-left group"
        >
          <MicIcon />
          <span className="text-xs text-gray-600 group-hover:text-gray-500 truncate transition-colors">
            {inputSummary}
          </span>
          {sinkIdSupported && (
            <>
              <span className="text-gray-800 flex-shrink-0">·</span>
              <SpeakerIcon />
              <span className="text-xs text-gray-600 group-hover:text-gray-500 truncate transition-colors">
                {outputSummary}
              </span>
            </>
          )}
          <ChevronIcon open={open} />
        </button>

        {open && (
          <div className="flex flex-col gap-3 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-14 flex-shrink-0">Input</span>
              <select
                value={inputDeviceId}
                onChange={(e) => onInputChange(e.target.value)}
                className={selectClass}
              >
                <option value="">System default</option>
                {inputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {deviceLabel(d, `Microphone ${d.deviceId.slice(0, 4)}`)}
                  </option>
                ))}
              </select>
            </div>

            {sinkIdSupported && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-14 flex-shrink-0">Output</span>
                <select
                  value={outputDeviceId}
                  onChange={(e) => onOutputChange(e.target.value)}
                  className={selectClass}
                >
                  <option value="">System default</option>
                  {outputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {deviceLabel(d, `Speaker ${d.deviceId.slice(0, 4)}`)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!sinkIdSupported && (
              <p className="text-xs text-gray-700">
                Output device selection is not supported in this browser.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MicIcon() {
  return (
    <svg className="w-3 h-3 text-gray-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg className="w-3 h-3 text-gray-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg className={`w-3.5 h-3.5 text-gray-700 flex-shrink-0 ml-auto transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
