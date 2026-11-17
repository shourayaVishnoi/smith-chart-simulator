# Engineering simulators

Animated, step-by-step solutions for engineering questions, plus live playgrounds. Open `index.html` (the home page) and pick a page.

## Graphs and systems

Each of these pages has a playground with sliders and live plots, then step-by-step question types.

| Page | Playground | Question types |
|---|---|---|
| `graph.html` | Graphing calculator: y = f(x), x = g(y), polar r(θ), parametric (f(t), g(t)), points, implicit equations, auto sliders, zoom and pan, hover trace with roots, turning points and crossings | Roots (bisection or Newton), where two curves meet, area under a curve (Riemann, trapezoid, Simpson vs exact), derivative with tangent and normal |
| `circuits.html` | Series RC, RL and RLC with a step source: step response and Bode plot of the chosen element | RC transient, RL transient, series RLC step response, resonance (series or parallel), AC series RLC phasors and power, first-order RC filter |
| `signals.html` | Fourier series builder, convolution flip-and-slide, sampling and aliasing | Fourier series of standard waves, convolution of two signals, sampling and aliasing, DFT of a short sequence |
| `control.html` | Type G(s) and drag K: closed-loop step response, root locus, Bode with margins, Nyquist | Second-order specs (or ζ and ωₙ from Mp and tp), Routh–Hurwitz (including ε and zero-row cases and K ranges), steady-state error, gain and phase margins, root-locus rules |

## EMTI: lines and waves

| Page | What it solves |
|---|---|
| `lossless.html` | Lossless transmission lines on the Smith chart: admittance and VSWR, input impedance, voltage max/min, load from measurements, single- and double-stub matching, quarter-wave transformer, stub reactance and length |
| `interfaces.html` | Plane waves at dielectric boundaries (normal incidence) on the Smith chart: single interface, dielectric slab, quarter-wave coating, medium from SWR |
| `lossy-media.html` | Plane waves in lossy media: general medium (exact α, β, η, δ), good conductor, low-loss dielectric, attenuation over a distance |
| `filled-lines.html` | Dielectric-filled lines: wavelength and velocity, electrical length, coaxial line, two-wire line |

Each question type has its own link, for example `lossless.html#single-stub`, `circuits.html#resonance` or `control.html#routh`.

## Files

- `site.css` — shared styles
- `smith-engine.js` — Smith chart walkthrough engine (used by `lossless.html` and `interfaces.html`)
- `lossless-modes.js`, `interfaces-modes.js` — the question types for those two pages
- `formula-engine.js` — formula walkthrough engine with animated scenes (used by every other page)
- `lossy-media.js`, `filled-lines.js` — the question types for those two pages
- `mathx.js` — expression parser (implicit multiplication, functions, constants), complex numbers, polynomials and roots, transfer functions from text, integration and root finding
- `plot.js` — canvas plotting: linear and log axes, curves with asymptote breaks, stems, markers, zoom and pan
- `graph.js`, `circuits.js`, `signals.js`, `control.js` — playground and question types for each tool page

No build step: everything is static HTML, CSS and JavaScript.

## Deploy on Vercel

Import this repo into Vercel, choose Framework preset **Other**, leave the build command empty, and deploy. Every push to `main` redeploys the site.
