# Beat Dagger

A browser-based audio recorder with a built-in step-sequencer metronome. Record takes with precise rhythmic reference, review your waveform, save named presets for different songs, and build a local library of recordings — all without leaving the browser.

---

## Features

**Metronome**
- Adjustable BPM (20–300) with tap tempo
- Time signatures: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8
- Step sequencer with up to 4 simultaneous sound rows
- Per-beat level cycling: accent → normal → ghost → mute
- Per-beat subdivision into 4 (÷ button on hover)
- Five sounds per row: Click, Soft, Woodblock, Beep, Shaker
- Adjustable volume
- Count-in bars (1, 2, or 4) before recording starts
- Auto-start metronome with recording

**Presets**
- Save the full metronome configuration (BPM, time signature, sequencer pattern, volume, count-in) under a name
- Load any preset instantly to switch between song setups
- Confirm-before-delete to prevent accidental removal

**Recording**
- Records from the microphone via the MediaRecorder API
- Live frequency level meter during recording
- Post-recording waveform display with optional beat markers
- Name recordings before saving; defaults to timestamp
- Recordings stored locally in IndexedDB — no server required
- Confirm-before-delete on saved recordings

---

## Tech Stack

| | |
|---|---|
| Framework | React 18 |
| Build | Vite |
| Styling | Tailwind CSS |
| Waveform | WaveSurfer.js v7 |
| Storage | IndexedDB via idb |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

```bash
npm run build    # production build
npm run preview  # preview the production build locally
```

---

## Browser Compatibility

Works in Chrome, Firefox, and Safari. Safari required several targeted fixes:

- `AudioContext` is created synchronously within the user gesture call stack to satisfy Safari's activation policy
- Audio is pre-decoded via `OfflineAudioContext` (which is never suspended) before being handed to WaveSurfer, bypassing an internal decode path that hangs in Safari
- `MediaRecorder` MIME type is detected at runtime (`audio/mp4` on Safari, `audio/webm` elsewhere) so recordings are stored and played back correctly
- IndexedDB stores audio as `ArrayBuffer` + MIME type rather than `Blob`, which Safari's structured clone algorithm rejects

---

## Project Structure

```
src/
├── components/
│   ├── MetronomePanel.jsx   # Metronome UI, step sequencer, presets
│   ├── Recorder.jsx         # Main recording flow, ties everything together
│   ├── RecordingList.jsx    # Saved recordings browser
│   └── WaveformPlayer.jsx   # WaveSurfer wrapper with Safari decode fix
├── hooks/
│   ├── useMetronome.js      # Web Audio API scheduler, all metronome logic
│   └── useRecorder.js       # MediaRecorder wrapper, level metering
└── lib/
    └── db.js                # IndexedDB helpers (recordings + presets)
```
