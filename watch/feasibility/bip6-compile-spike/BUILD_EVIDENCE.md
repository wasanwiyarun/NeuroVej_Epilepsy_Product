# Compile Evidence — 2026-09-03

**Controlled work item:** DOC#5
**Scope:** Non-clinical toolchain and Amazfit Bip 6 target feasibility only

## Environment

- Host: Linux x86-64
- Node.js: 24.19.0
- npm: 11.17.0
- Zeus CLI: 1.9.3
- ZPM reported by Zeus: 3.4.2
- Dependency installation: clean `npm ci` from committed lockfile
- npm registry license metadata: Zeus CLI ISC; ZPM MIT

## Target

Zeus recognized canonical target `Amazfit Bip 6` and built device sources
9765120, 9765121, and 10158337.

## Result

`npm run build` completed with exit code 0. Rollup transformed two JavaScript
files, PNG-to-TGA conversion completed, and QJSC compiled two JavaScript files.
The build had no compile warning after the generated icon was increased to
124 x 124 pixels.

Local generated artifact:

```text
dist/1090900-Bip_6_Compile_Spike-0.0.1-20260903195841.zab
size: 9852 bytes
SHA-256: 16cb59e3933318f213499e7748b5c482156b9b0ec83bd821b58cd223b424094b
```

The timestamped package is ignored by Git and is not a release baseline.

## Tool/security observations

- Zeus CLI 1.9.3 local installation requires a compatibility link to its own
  bundled `zeppos-app-utils`. The checked post-install script creates the link
  and refuses to overwrite an existing non-link path.
- The clean development dependency tree reported 31 known vulnerabilities:
  3 low, 7 moderate, 19 high, and 2 critical.
- `npm audit --omit=dev` reported zero vulnerabilities because the spike has no
  delivered npm runtime dependencies.
- Zeus and its dependency tree remain non-product software requiring NPS-001
  evaluation before build output is accepted as controlled lifecycle evidence.

## Unverified

- installation or execution in an Amazfit Bip 6 simulator;
- installation or execution on a physical Amazfit Bip 6;
- raw sensor availability, sampling rate, background execution, battery use,
  storage, or communications;
- any seizure-related or medical function.
