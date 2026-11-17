# EMTI simulators

Animated, step-by-step solutions for EMTI questions. Open `index.html` (the home page) and pick a family:

| Page | What it solves |
|---|---|
| `lossless.html` | Lossless transmission lines on the Smith chart: admittance and VSWR, input impedance, voltage max/min, load from measurements, single- and double-stub matching, quarter-wave transformer, stub reactance and length |
| `interfaces.html` | Plane waves at dielectric boundaries (normal incidence) on the Smith chart: single interface, dielectric slab, quarter-wave coating, medium from SWR |
| `lossy-media.html` | Plane waves in lossy media: general medium (exact α, β, η, δ), good conductor, low-loss dielectric, attenuation over a distance |
| `filled-lines.html` | Dielectric-filled lines: wavelength and velocity, electrical length, coaxial line, two-wire line |

Each question type has its own link, for example `lossless.html#single-stub` or `lossy-media.html#conductor`.

## Files

- `site.css` — shared styles
- `smith-engine.js` — Smith chart walkthrough engine (used by `lossless.html` and `interfaces.html`)
- `lossless-modes.js`, `interfaces-modes.js` — the question types for those two pages
- `formula-engine.js` — formula walkthrough engine with animated scenes (used by `lossy-media.html` and `filled-lines.html`)
- `lossy-media.js`, `filled-lines.js` — the question types for those two pages

No build step: everything is static HTML, CSS and JavaScript.

## Deploy on Vercel

Import this repo into Vercel, choose Framework preset **Other**, leave the build command empty, and deploy. Every push to `main` redeploys the site.
