# Smith Chart — Animated Solution

An interactive, step-by-step Smith chart walkthrough for EMTI.

Default problem: a 50 Ω line terminated by Z_L = 25 − j50 Ω. The page finds the normalized load admittance y_L and the VSWR on the Smith chart, animating each construction step (normalize, r circle, x arc, VSWR circle, 180° rotation). The "Try another load" box re-solves for any Z₀ and Z_L.

- `index.html` — the whole site in one static file (no build step).

## Deploy on Vercel

Import this repo into Vercel, choose Framework preset **Other**, leave the build command empty, and deploy. Every push to `main` redeploys the site.
