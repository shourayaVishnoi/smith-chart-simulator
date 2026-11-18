# Engineering simulators

Animated, step-by-step solutions for engineering questions, plus live playgrounds. Open `index.html` (the home page) and pick a page.

Every page has step-by-step question types. Most also have a playground with sliders and live plots. The nav groups the pages the same way as below.

## Fields and lines

| Page | Playground | Question types |
|---|---|---|
| `electrostatics.html` | Drag point charges: field lines, equipotentials, field arrows and a hover probe for E and V, with presets | Net Coulomb force from charges, E and V at a point, Gauss's law (sphere, shell, line, cylinder, sheet), capacitance (parallel plate, coaxial, spherical) |
| `lossless.html` | — | Lossless transmission lines on the Smith chart: admittance and VSWR, input impedance, voltage max/min, load from measurements, single- and double-stub matching, quarter-wave transformer, stub reactance and length |
| `interfaces.html` | — | Plane waves at dielectric boundaries (normal incidence) on the Smith chart: single interface, dielectric slab, quarter-wave coating, medium from SWR |
| `lossy-media.html` | — | Plane waves in lossy media: general medium (exact α, β, η, δ), good conductor, low-loss dielectric, attenuation over a distance |
| `filled-lines.html` | — | Dielectric-filled lines: wavelength and velocity, electrical length, coaxial line, two-wire line |

## Circuits and systems

| Page | Playground | Question types |
|---|---|---|
| `circuits.html` | Series RC, RL and RLC with a step source: step response and Bode plot of the chosen element | RC transient, RL transient, series RLC step response, resonance (series or parallel), AC series RLC phasors and power, first-order RC filter |
| `electronics.html` | Diode load line and Q-point, BJT output characteristics with DC load line, op-amp input and output waveforms with clipping | Diode Q-point (exponential model by Newton's method, constant drop, ideal), BJT voltage-divider bias, MOSFET drain current (saturation or triode), op-amp circuits (inverting, non-inverting, summing, difference), active RC filters |
| `logic.html` | Type an expression or minterm list: truth table, clickable K-map, minimal SOP and POS, gate circuit lit by the chosen row | K-map minimisation (with don't-cares), canonical SOP and POS, number base conversion, two's complement, flip-flop timing (JK, D, T, SR) |
| `signals.html` | Fourier series builder, convolution flip-and-slide, sampling and aliasing | Fourier series of standard waves, convolution of two signals, sampling and aliasing, DFT of a short sequence |
| `control.html` | Type G(s) and drag K: closed-loop step response, root locus, Bode with margins, Nyquist | Second-order specs (or ζ and ωₙ from Mp and tp), Routh–Hurwitz (including ε and zero-row cases and K ranges), steady-state error, gain and phase margins, root-locus rules |

## Maths and physics

| Page | Playground | Question types |
|---|---|---|
| `graph.html` | Graphing calculator: y = f(x), x = g(y), polar r(θ), parametric (f(t), g(t)), points, implicit equations, auto sliders, zoom and pan, hover trace with roots, turning points and crossings | Roots (bisection or Newton), where two curves meet, area under a curve (Riemann, trapezoid, Simpson vs exact), derivative with tangent and normal |
| `probability.html` | Normal, binomial, Poisson, uniform, exponential, t and chi-square with shaded probabilities and random sampling | Normal probabilities (and the inverse), binomial, Poisson, descriptive statistics and regression, Bayes' theorem, confidence intervals (z or t) |
| `matrices.html` | A 2×2 matrix transforming the plane, with determinant area, eigenvectors and a draggable vector | Determinant, inverse by Gauss–Jordan, linear systems (unique, none or infinitely many solutions), eigenvalues and eigenvectors |
| `mechanics.html` | Projectile with drag and gravity presets, spring–mass with damping and driving force, two-wave superposition (standing waves and beats) | Projectile motion, SHM, damped oscillator, driven oscillator and resonance, travelling waves, standing waves on strings and in pipes |

Each question type has its own link, for example `lossless.html#single-stub`, `circuits.html#resonance`, `logic.html#kmap` or `matrices.html#eig`.

## Files

- `site.css` — shared styles
- `smith-engine.js` — Smith chart walkthrough engine (used by `lossless.html` and `interfaces.html`)
- `lossless-modes.js`, `interfaces-modes.js` — the question types for those two pages
- `formula-engine.js` — formula walkthrough engine with animated scenes (used by every other page)
- `lossy-media.js`, `filled-lines.js` — the question types for those two pages
- `mathx.js` — expression parser (implicit multiplication, functions, constants), complex numbers, polynomials and roots, transfer functions from text, integration and root finding
- `plot.js` — canvas plotting: linear and log axes, curves with asymptote breaks, stems, markers, zoom and pan
- `graph.js`, `circuits.js`, `signals.js`, `control.js`, `electrostatics.js`, `electronics.js`, `logic.js`, `probability.js`, `matrices.js`, `mechanics.js` — playground and question types for each of those pages

No build step: everything is static HTML, CSS and JavaScript.

## Deploy on Vercel

Import this repo into Vercel, choose Framework preset **Other**, leave the build command empty, and deploy. Every push to `main` redeploys the site.
