# LOUP Sequence Autopilot — AI-Assisted Procedural Automation

**Live app → https://1boscochiramel.github.io/loup-sequence-simulator/**

An AI-assisted **procedural-automation co-pilot** (ISA-106 / Modular Procedural Automation) that runs a
process unit's DCS **start-up auto-sequence** and its **emergency SOPs** step-by-step — validating interlocks,
ramping pressures/temperatures, running hold tests, taking conditional **HOLD / ESD** branches, and pausing for
the operator to **sign off** on key actions. Every action is logged to an audit trail.

Built for the **HPCL hackathon**. Runs entirely in the browser — no backend, no keys.

> 🔒 **Confidentiality:** every operating value (pressures, temperatures, flows, setpoints, trip thresholds) is
> **randomised and illustrative — NOT actual plant data**. Execution runs on a **synthetic twin** with no
> connection to any live DCS.

---

## What it does

- **▶ Start-up** — the full 5-controller DCS start-up auto-sequence (HP-circuit pressurization → reactor heating →
  feed/stripper readiness → feed cut-in & stabilization → wash-water system) with ramps, 30-min hold tests, and
  conditional HOLD logic.
- **🚨 Emergency** — a picker of **9 emergency procedures**: hydrogen failure, recycle-gas-compressor failure,
  instrument-air failure, offsite feed-pump failure, loss of onsite liquid charge, dewaxed-oil-pump failure,
  amine-pump failure, sea-cooling-water failure, and reactor-temperature-runaway restart.
- **Live run** view (the sequence executes itself with field/DCS sign-off gates) and a printable **Sequence table** view.

## Autonomy level

Demonstrates **Yokogawa IA2IA Level 3 (semi-autonomous)**: the system executes pre-programmed steps; a human
signs off on key actions. Shown on a digital twin as the safe, deployable first step up the maturity curve —
*not* a claim that a real plant is autonomous.

## Platform mapping (recommended hackathon stack)

| Platform | Role |
|----------|------|
| 🧠 **Fluid AI** | Generate / explain / adapt the procedure; answer operator questions in natural language |
| 📊 **Microsoft Power Apps** | The operator cockpit (this UI, low-code) |
| 🤖 **UiPath** | Pull SOPs from legacy systems; log actions; send notifications |

## Why it matters

Start-ups, shutdowns and emergencies are where a plant carries the most **risk, cost and expert-dependence**.
Guided auto-sequencing → **faster, safer, error-free** transitions, **captured expert knowledge**, and a full
**auditable** action log for post-incident review.

---

## Run locally
```bash
python -m http.server 8081     # then open http://localhost:8081
```

## Files
| File | Role |
|------|------|
| `index.html` | The app UI |
| `loup_autopilot.js` | Procedural-automation engine (check / field / signoff / ramp / hold / branch) |
| `loup_sequence.js` | Sequence data — start-up + 9 emergency scenarios (values randomised) |
| `style.css` | Styling |

## Deploy (live URL)
Static site, no build. **Settings → Pages → Deploy from a branch → `main` / root**. A `.nojekyll` file is
included so GitHub Pages serves the static assets directly (no Jekyll). Public-repo Pages is free; private-repo
Pages needs a paid plan.
