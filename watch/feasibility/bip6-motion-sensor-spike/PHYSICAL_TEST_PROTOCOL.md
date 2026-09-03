# Physical Test Protocol — Draft

**Controlled work item:** DOC#5

**Protocol reference:** FEA-PRO-001

**Scope:** Foreground sensor acquisition and local alert UI self-test only

This draft is not a clinical study and must not be used with patients or as a
medical or emergency-response test. Use only ordinary, comfortable wrist
movements. Never ask anyone to provoke, imitate, or withhold care for a
seizure.

## Record before testing

- test date/time and tester;
- watch model and regional variant;
- watch firmware version;
- Zepp mobile-app version and phone OS;
- exact Product commit and pinned Node/npm/Zeus/ZPM versions;
- preview-generated package filename, byte size, SHA-256, and QR-generation
  time recorded before scanning;
- app version shown in Zepp Developer Mode and app name launched on the watch;
- whether the watch is worn or held; and
- battery level, relevant power-saving mode, and the user's normal screen-off
  setting if it is available.

## Procedure

1. Use a fresh disposable checkout at the exact recorded commit, Node 24.19.0,
   a clean `npm ci`, and an initially empty `dist/` directory. Run
   `npm run preview` exactly once.
2. When the terminal QR appears and before scanning it, record the sole new
   `.zab` filename, byte size, SHA-256, and QR-generation time. This is the
   preview payload associated with the QR session; do not substitute a package
   from a separate `npm run build`. Record that Zepp does not provide an
   on-device byte/hash receipt if that remains true.
3. In Zepp Developer Mode's `Mini Program` tab, tap the QR/scanner icon at the
   upper right and scan that terminal QR. Confirm version 0.1.3 in Developer
   Mode; the current watch page does not display a version.
4. Launch `Bip 6 Sensor Logger` on the watch and confirm both safety labels are
   visible.
   Confirm the banner initially says `INITIALIZING SENSORS` and does not say
   `Monitoring` before both streams are valid.
5. Exercise the page-bright cleanup while its 150-second request is still
   active: within 10 seconds of the initial launch, exit the logger. This is
   lifecycle cycle 1 of 5. Without touching the screen, wait until five seconds
   after the recorded normal screen-off interval, or 30 seconds when that
   interval is unavailable. Record the actual screen behavior. If the user's
   display policy or always-on behavior makes the observation non-discriminating,
   record this physical reset check as Deferred rather than claiming a pass.
   Relaunch the logger and confirm fresh startup and reset statistics.
6. As soon as both streams are active after that relaunch, begin the stationary
   timer without
   touching the screen. The code requests the finite 150-second page-bright
   interval during page build. Its 30-second difference from the observation
   duration is only a planning margin because the supplier contract does not
   specify precise timer start/restart semantics. Hold the watch still for two
   minutes. Record the ACC/GYRO magnitudes,
   callback rates, callback counts, `dt`, `gap`, `age`, and sensor-health
   text at 5, 15, 30, 60, and 120 seconds. Record each stream separately.
   `dt` is the minimum/maximum completed callback interval; `gap` is the
   longest callback silence since session start, including a currently open
   silence; and `age` is the age of the most recent valid sensor value.
   Record whether the page remains visible without a tap through 120 seconds.
   If it does not, stop and record a failed observation/deviation; do not infer
   that acquisition continued while the screen was off.
7. Press `RUN ALERT UI SELF-TEST` once while observing an external stopwatch.
   Confirm the banner is exactly `Alert UI self-test`; record the approximate
   time at which vibration ceases. The application schedules one stop request
   using a nominal Development timer delay of 1,000 ms. The physical
   observation passes only when vibration ceases without manual intervention
   and is not perceptible at 2.0 seconds after the press. The extra second is
   operator-observation
   tolerance, not a claim that the application timer guarantees physical
   interruption at exactly 1,000 ms. If vibration remains perceptible at the
   two-second checkpoint, exit the app and record a failure/anomaly.
8. During the same five-second visual self-test, press the button repeatedly.
   Confirm the title, visual interval, and haptic output do not restart and no
   additional vibration begins. Confirm that no medical event is asserted.
9. After the self-test ends, make gentle ordinary wrist rotations for 15
   seconds. Confirm values change and the screen never presents a health
   assessment.
10. Exit and relaunch once for lifecycle cycle 2. Then perform exactly three
   additional exit/relaunch cycles, numbered 3 through 5. Across cycles 2-5,
   confirm fresh sensor startup, reset counts/statistics, no lingering haptic
   output, and record every crash, stale state, unavailable state, or unexpected
   behavior. Cycle 1 from step 5 plus these four cycles is five total.
11. Uninstall the package when testing is complete.

## Pass/fail observations

| Observation ID | Acceptance observation | Result |
| --- | --- | --- |
| FEA-WATCH-MT-001 | Both explicit non-medical labels remain visible | Pending |
| FEA-WATCH-MT-002 | ACC and GYRO each reach the combined `Sensors streaming (foreground)` state; otherwise record the explicit per-stream failure and mark this criterion failed | Pending |
| FEA-WATCH-MT-003 | Both data ages update and remain below stale limit during the run | Pending |
| FEA-WATCH-MT-004 | Ordinary gentle movement changes displayed values plausibly | Pending |
| FEA-WATCH-MT-005 | Banner is exactly `Alert UI self-test`; vibration ceases without intervention and is not perceptible at 2.0 seconds; repeated active-state presses add no vibration; no medical assertion appears | Pending |
| FEA-WATCH-MT-006 | Exactly five total exit/relaunch cycles—cycle 1 plus four repeats—show fresh visible state and no lingering stream or vibration symptom | Pending |
| FEA-WATCH-MT-007 | ACC and GYRO independently show session count, minimum/maximum completed interval, and maximum observed gap | Pending |
| FEA-WATCH-MT-008 | The isolated preview package, QR session, Developer Mode version, and watch app launch are attributable without claiming an on-device hash receipt | Pending |
| FEA-WATCH-MT-009 | The logger page remains visible without screen interaction through the 120-second stationary observation | Pending |
| FEA-WATCH-MT-010 | Early exit while the 150-second request is active shows normal post-exit display behavior against the recorded user policy, or is explicitly Deferred when that physical observation is non-discriminating | Pending |

The displayed timing values use local callback-arrival time. They are not
sensor-provided timestamps and do not establish synchronized samples or a
guaranteed sampling rate.

The physical exit/relaunch observation can show reset state and absence of a
continued-monitoring claim or lingering haptic symptom. It cannot by itself
prove that an internal sensor listener or timer stopped; source and unit tests
provide separate cleanup evidence. Likewise, visible screen behavior cannot
prove the display API call or reset; source and unit tests provide separate
call-path evidence. Do not cover or obstruct the watch as a method for forcing
stale sensor callbacks.

Source and host tests verify the configured 1,000-ms timer delay and bounded
stop-attempt paths; they do not establish an application deadline. The physical
two-second check records an externally observable outcome with human timing
tolerance; it does not prove timer dispatch time, firmware interruption, or a
maximum physical vibration duration.

Photographs and detailed device identifiers belong in the private evidence
repository. The public source repository should contain only a sanitized
result summary and the opaque DOC#5 reference.
