# Build Evidence — 2026-09-03

**Controlled work item:** DOC#5

**Scope:** Non-clinical foreground ACC/GYRO acquisition and alert UI self-test

## Static and unit verification

- Node.js syntax checks passed for the app, page, and both shared libraries.
- `npm test` completed with exit code 0.
- Ten named checks in two test files passed. They cover vector conversion,
  invalid data, stale and initial-sample timeouts, invalid timing, callback-rate
  calculation, display formatting, sensor start/callback/stop order, callback
  identity during cleanup, startup-failure cleanup, and suppression of a late
  callback after stop.

## Package build

`npm run build` completed with exit code 0 using the pinned Node.js 24.19.0
workspace toolchain, npm 11.17.0, Zeus CLI 1.9.3, and ZPM 3.4.2. Zeus selected
device sources 9765120, 9765121, and 10158337. Rollup transformed the app and
page bundles, PNG-to-TGA conversion completed, and QJSC compiled both bundles.

Local generated artifact:

```text
dist/1090901-Bip_6_Sensor_Logger-0.1.0-20260903234601.zab
size: 22769 bytes
SHA-256: 4a8bc29ca5185593e7a0cffb40b7c3f651a5d364102881c6d50c7063110a5597
```

The timestamped package is ignored by Git and is not a release baseline. It
contains Zeus intermediate products and is for owner-run feasibility testing
only.

The deterministic 124 x 124 source icon has SHA-256
`34ffbbf6e40f587db713a3122f6047710061da466321bd2d3a1cc4922efe37c2`.

## Tool/security observations

- The app declares only the Zepp accelerometer and gyroscope permissions. It
  declares no background-service, storage, BLE, network, or notification
  permission.
- There are no delivered npm runtime dependencies; npm packages are used by
  the development build only.
- The clean development dependency install reported 31 known transitive
  vulnerabilities: 3 low, 7 moderate, 19 high, and 2 critical.
- Zeus CLI 1.9.3 still needs the checked compatibility link to its bundled
  `zeppos-app-utils`. Zeus and its dependency tree require NPS/security
  evaluation before build output is accepted as controlled lifecycle evidence.

## Physical-device verification

Pending owner execution using `PHYSICAL_TEST_PROTOCOL.md`. A successful compile
does not prove sensor availability or correct behavior on a physical Amazfit
Bip 6.

## Explicitly unverified

- clinical performance or any seizure-related function;
- background or continuous monitoring;
- exact or guaranteed sample frequency;
- long-duration reliability and battery consumption;
- motion-data storage, export, or phone communication;
- algorithm-driven detection or alerting; and
- operation on a physical watch until the pending protocol is run.
