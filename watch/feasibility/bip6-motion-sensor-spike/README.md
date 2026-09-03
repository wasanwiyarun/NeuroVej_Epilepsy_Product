# Amazfit Bip 6 Foreground Motion-Sensor Spike

This DOC#5 version 0.1.3 app is a non-clinical feasibility probe for
FEA-PRO-001. It opens
the Amazfit Bip 6 accelerometer and gyroscope at Zepp OS `FREQ_MODE_NORMAL`,
shows live vector magnitudes, observed callback rates, session callback counts,
minimum/maximum callback intervals, maximum observed callback gaps, and data
ages. At page build it requests a finite 150-second screen-lighting interval
to support the two-minute foreground observation, and it explicitly resets
that request while stopping both streams when the page is destroyed.

It does **not** detect, diagnose, predict, or rule out seizures. It does not
show a "normal" state, persist motion data, transmit data, contact a phone, or
raise an algorithm-driven alert. The button runs only an explicitly labelled
visual and finite haptic **self-test** whose banner is exactly
`Alert UI self-test`.

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
- Callback timing statistics use bounded, constant memory. `min/max` covers
  completed callback-to-callback intervals; `gap` is the longest callback
  silence seen since sensor-session start, including the current open silence;
  and `age` is the age of the last valid sensor value.
- Callback times are local `Date.now()` arrival observations, not
  supplier-provided sensor timestamps. They cannot establish exact acquisition
  timing, synchronized ACC/GYRO samples, or an algorithm-ready sample rate.
- A backwards callback-arrival time latches `Sensor timing error - stop test`
  for the rest of the foreground session. A fresh launch resets the statistics
  and fault latch.
- The compact row shows callback count as `n`, last-valid-sample age as `age`,
  minimum/maximum interval as `dt`, and longest silence as `gap`. Values beyond
  the fixed display range use a trailing `+`; the two-minute protocol remains
  inside the exact display range under expected callback rates.
- The self-test uses one `VIBRATOR_SCENE_NOTIFICATION` scene and schedules one
  explicit application `stop()` request with a nominal Development timer delay
  of 1,000 ms. This delay argument is not an execution deadline and does not
  prove that firmware physically interrupts a blocked or faulty runtime at that
  instant. Repeated presses remain ignored during the five-second visual
  self-test.
- Haptic start, stop, scheduling, and cancellation exceptions are contained
  without retry loops. The visual self-test remains non-medical and shows a
  short haptic fault status when the application cannot establish the normal
  stop-request path.
- Page cleanup cancels a pending haptic-stop timer. A successful stop is never
  repeated; if the first stop throws, cleanup permits exactly one further stop
  attempt. Repeated cleanup is idempotent, so no path makes more than two stop
  attempts for one scene start.
- Each foreground page session makes at most one
  `setPageBrightTime({ brightTime: 150000 })` request. This temporarily extends
  screen lighting only. The configured value is nominally 30 seconds longer
  than the required 120-second observation, but Zepp does not document precise
  start/restart semantics; it is not an always-on-display or background mode.
- Cleanup calls `resetPageBrightTime()` once, including after a synchronous
  page-build failure. Non-zero results and exceptions from either display API
  are contained and logged. The build and host tests verify these calls, while
  their effect on Bip 6 firmware remains a physical-test observation.
- Do not use this app for medical decisions or emergency response.
- Do not provoke or imitate seizure-like movement to test it.

## Foreground-only limitation

The sensors run only while this Device App page is active. Zepp's published
App Service restrictions prohibit high-power accelerometer and gyroscope use
in the background service. This spike therefore cannot establish feasibility
for continuous background monitoring. Closing or leaving the app must be
treated as monitoring stopped. Extending the page's screen-lighting time does
not change that limitation and does not keep acquisition alive after cleanup.

There is intentionally no App Service, Side Service, network permission,
storage permission, or mobile notification implementation in this package.
The timing extension also stores no callback history or raw motion log.

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
- per-stream callback count, minimum/maximum completed callback interval, and
  maximum observed callback silence for the foreground session;
- whether values change plausibly with ordinary wrist movement;
- whether data-stale and unavailable states appear safely;
- whether the finite screen-lighting request keeps the page visible through
  the required 120-second stationary observation and normal display behavior
  resumes after exit;
- whether the finite visual/haptic self-test is distinguishable from ordinary
  monitoring, whether vibration ceases without manual intervention, and
  whether it is no longer perceptible at the protocol's two-second physical
  observation point; and
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

## Official API references checked on 2026-09-04

- [Accelerometer](https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Accelerometer/)
- [Gyroscope](https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Gyroscope/)
- [Vibrator](https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Vibrator/)
- [setPageBrightTime](https://docs.zepp.com/docs/reference/device-app-api/newAPI/display/setPageBrightTime/)
- [resetPageBrightTime](https://docs.zepp.com/docs/reference/device-app-api/newAPI/display/resetPageBrightTime/)
- [App Service limitations](https://docs.zepp.com/docs/guides/framework/device/app-service/)
- [Amazfit Bip 6 target data](https://docs.zepp.com/docs/reference/related-resources/device-list/)
