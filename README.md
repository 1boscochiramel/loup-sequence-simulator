# LOUP Sequence Autopilot — ISA-106 procedural automation

A browser-only, GitHub-Pages-ready app that runs the **LOUP** (Lube Oil Up-gradation Unit)
DCS **start-up** and **emergency (ESD)** auto-sequences *live*: press Start and it validates
interlocks, ramps pressures/temperatures, runs hold timers, takes conditional HOLD branches,
and pauses for operator sign-off at key gates — every action logged.

No backend, no keys. All execution is on a **synthetic twin** of the sequence.

## Files
| File | Role |
|------|------|
| `index.html` | The app (UI). |
| `loup_autopilot.js` | The procedural-automation engine (step runner: check / field / signoff / ramp / hold / branch). |
| `loup_sequence.js` | The sequence data — **STARTUP** (transcribed from the plant DCS auto-sequence sheet, 117 steps, 5 controllers) and **EMERGENCY** (ESD, derived). |
| `style.css` | Styling. |

## Two sequences
- **Start-up** — HP-circuit pressurization & hold test → reactor heating (F-1101) → feed & stripper readiness → feed cut-in & stabilization → wash-water system. Real tags, ramp rates, 30-min hold tests, conditional HOLD logic — as written on the sheet.
- **Emergency (ESD)** — ESD initiation & feed trip → fired-heater trip → emergency depressurization (blowdown to flare) → reactor quench & cool-down → compressor trip & safe isolation.

Each has a **Live run** view (the running SFC) and a printable **Sequence table** view (scan-style; use 🖨 Print / Save as PDF).

## Provenance / honesty
- **Start-up** steps are transcribed from the plant's DCS auto-sequence sheet.
- **Emergency (ESD)** is **DERIVED** from standard hydroprocessing emergency-depressurization practice + the unit tags — it is **not** an official plant ESD sheet. Supply the real emergency auto-sequence sheet and it can be transcribed faithfully like the start-up.
- All execution is synthetic; there is **no connection to any live DCS**.

## Run
Static — open `index.html`, or serve the folder:
```bash
python -m http.server 8081
# http://localhost:8081
```

## Deploy (GitHub Pages)
Push and enable Pages (Settings → Pages → Source: GitHub Actions). The workflow in
`.github/workflows/deploy-pages.yml` publishes this folder on every push to `main`.
