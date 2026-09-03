# Amazfit Bip 6 Foreground Motion-Sensor Spike

This DOC#5 app is a non-clinical feasibility probe for FEA-PRO-001. It opens
the Amazfit Bip 6 accelerometer and gyroscope at Zepp OS `FREQ_MODE_NORMAL`,
shows live vector magnitudes, observed callback rates, and data ages, and then
stops both streams when the page is destroyed.

It does **not** detect, diagnose, predict, or rule out seizures. It does not
show a "normal" state, persist motion data, transmit data, contact a phone, or
raise an algorithm-driven alert. The button runs only an explicitly labelled
visual and finite haptic **self-test**.

## Safety boundary

- Every operating screen says `Research prototype` and
  `NOT FOR MEDICAL USE`.
- `Monitoring: sensor stream only` describes sensor acquisition, not a health
  assessment, and appears only after both streams provide fresh valid data.
- Sensor startup, invalid values, stale data, and timing faults produce visible
  failure states instead of a reassuring state.
- Five-second initial-sample and 2.5-second stale-data limits are engineering
  UI fault thresholds only. They are not medical thresholds or sampling-rate
  guarantees.
- The self-test uses one finite `VIBRATOR_SCENE_NOTIFICATION` scene, ignores
  repeated presses while active, and is stopped again during cleanup.
- Do not use this app for medical decisions or emergency response.
- Do not provoke or imitate seizure-like movement to test it.

## Foreground-only limitation

The sensors run only while this Device App page is active. Zepp's published
App Service restrictions prohibit high-power accelerometer and gyroscope use
in the background service. This spike therefore cannot establish feasibility
for continuous background monitoring. Closing or leaving the app must be
treated as monitoring stopped.

There is intentionally no App Service, Side Service, network permission,
storage permission, or mobile notification implementation in this package.

## Pinned environment

- Node.js 24.19.0
- npm supplied with Node.js 24.19.0
- `@zeppos/zeus-cli` 1.9.3 (development-only)
- Zepp OS API target 4.2

The lockfile and its integrity fields define the dependency baseline. Zeus
CLI remains non-product software requiring the project's NPS evaluation before
its output is accepted as controlled lifecycle evidence. Its known transitive
vulnerabilities also prevent treating this package as a release baseline.

## Verify

From this directory, using the pinned Node.js 24.19.0 runtime:

```sh
npm ci
npm test
npm run build
```

The build targets all currently published Amazfit Bip 6 device sources:
9765120, 9765121, and 10158337. Generated packages are written below `dist/`
and ignored by Git.

The local workspace bootstrap uses the pinned runtime under
`003_Amatfit/.toolchains/`; downloaded toolchains are intentionally outside
the Git repositories.

## What a physical-device run can answer

- whether both sensor constructors and permissions work on the owner's watch;
- observed callback rates for Zepp's qualitative `FREQ_MODE_NORMAL` setting;
- whether values change plausibly with ordinary wrist movement;
- whether data-stale and unavailable states appear safely;
- whether the finite visual/haptic self-test is distinguishable from ordinary
  monitoring; and
- whether cleanup behaves on exit and repeated launch.

It cannot establish clinical performance, continuous-monitoring feasibility,
sampling-rate guarantees, battery life, or seizure-related performance.

## Install the feasibility build on the watch

Use the repository-local Zeus CLI through npm; a global `zeus` command is not
required. From this directory, with the pinned Node.js runtime selected:

```sh
npm run zeus:login  # only if this computer is not already logged in
npm run preview
```

Keep the preview command running while its QR code is displayed. In the Zepp
mobile app, open `Developer Mode` > `Mini Program`, tap the QR/scanner icon at
the upper right, and scan that terminal QR code. Select the paired Amazfit Bip
6 if prompted, wait for installation, then launch `Bip 6 Sensor Logger` from
the watch app list.

Record the generated package identity and all observations using
`PHYSICAL_TEST_PROTOCOL.md`. The preview package is temporary feasibility
software and must not be used for health monitoring.

## Official API references checked on 2026-09-03

- [Accelerometer](https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Accelerometer/)
- [Gyroscope](https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Gyroscope/)
- [Vibrator](https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Vibrator/)
- [App Service limitations](https://docs.zepp.com/docs/guides/framework/device/app-service/)
- [Amazfit Bip 6 target data](https://docs.zepp.com/docs/reference/related-resources/device-list/)
