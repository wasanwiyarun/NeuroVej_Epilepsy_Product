# Amazfit Bip 6 Compile Spike

This is a non-clinical feasibility app for DOC#5. It verifies only that a
minimal Zepp OS package can target and compile for Amazfit Bip 6. It does not
read sensors, detect seizures, generate alerts, or support a medical claim.

## Pinned environment

- Node.js 24.19.0
- npm supplied with Node.js 24.19.0
- `@zeppos/zeus-cli` 1.9.3 (npm metadata: ISC)
- `@zeppos/zpm` 3.4.2, resolved transitively (npm metadata: MIT)

Zeus CLI 1.9.3 uses `zeppos-app-utils` without declaring it in its npm
dependency list. The similarly named public npm package is API-incompatible.
The checked `postinstall` script creates a local link to the compatible copy
already bundled inside the pinned Zeus package. It refuses to replace any
existing file or directory.

The dependency lockfile and npm integrity fields are authoritative for the npm
dependency versions used by this spike. Zeus CLI is third-party non-product
software and requires evaluation in NPS-001 before its output is relied on as
controlled lifecycle evidence.

## Amazfit Bip 6 target

The configuration uses Zepp's published values as checked on 2026-09-03:

- Zepp OS 5.0;
- API level 4.2;
- 390 x 450 square display;
- design width 390;
- device sources 9765120 (Mainland China), 9765121, and 10158337.

## Build

Use Node.js 20 or newer. From this directory:

```sh
npm ci
npm run build
```

The build script selects the canonical Zeus device name `Amazfit Bip 6` and
generates a deterministic 124 x 124 placeholder icon before compilation.

The local workspace bootstrap used the verified Node.js 24.19.0 binary under
`003_Amatfit/.toolchains/`; that downloaded runtime is intentionally outside
Git repositories.

Expected package output is written below `dist/`, which is ignored by Git.

The current dependency tree reports known transitive vulnerabilities. Do not
use this toolchain to produce release evidence until NPS/security evaluation
and mitigations are approved.

## Limitations

- Physical-device installation and foreground launch were observed on
  2026-09-03; this does not prove reliable or production operation.
- No simulator, repeated-launch, reboot, or uninstall/reinstall test is
  included.
- The placeholder app ID is not an approved production or store identity.
- Sensor availability, sampling, background operation, communication, and
  power behavior remain open FEA-001 questions.
