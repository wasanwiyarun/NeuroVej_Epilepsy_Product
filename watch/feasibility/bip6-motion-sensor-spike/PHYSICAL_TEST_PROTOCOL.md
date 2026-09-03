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
   upper right and scan that terminal QR. Confirm version 0.1.2 in Developer
   Mode; the current watch page does not display a version.
4. Launch `Bip 6 Sensor Logger` on the watch and confirm both safety labels are
   visible.
   Confirm the banner initially says `INITIALIZING SENSORS` and does not say
   `Monitoring` before both streams are valid.
5. As soon as both streams are active, begin the stationary timer without
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
6. Make gentle ordinary wrist rotations for 30 seconds. Confirm values change
   and the screen never presents a health assessment.
7. Press `RUN ALERT SELF-TEST` once. Confirm the screen says
   `ALERT UI SELF-TEST`, haptic feedback is finite, and no medical event is
   asserted.
8. Press the button repeatedly during the five-second visual self-test. Confirm
   it does not restart or create continuous vibration.
9. Exit the app, wait 30 seconds, and launch it again. Confirm a fresh sensor
   startup, session counts/statistics reset, no lingering haptic output, and
   no observed symptom that the logger's finite screen-lighting request remains
   active outside the logger page. Interpret screen behavior against the
   user's recorded display setting rather than assuming a fixed timeout.
10. Repeat launch/exit five times and record any crash, stale state, unavailable
   state, or unexpected behavior.
11. Uninstall the package when testing is complete.

## Pass/fail observations

| Observation ID | Acceptance observation | Result |
| --- | --- | --- |
| FEA-WATCH-MT-001 | Both explicit non-medical labels remain visible | Pending |
| FEA-WATCH-MT-002 | ACC and GYRO reach `Sensors streaming (foreground)` | Pending |
| FEA-WATCH-MT-003 | Both data ages update and remain below stale limit during the run | Pending |
| FEA-WATCH-MT-004 | Ordinary gentle movement changes displayed values plausibly | Pending |
| FEA-WATCH-MT-005 | Self-test is explicit, finite, and makes no medical assertion | Pending |
| FEA-WATCH-MT-006 | Five exit/relaunch cycles show no lingering stream or vibration symptom | Pending |
| FEA-WATCH-MT-007 | ACC and GYRO independently show session count, minimum/maximum completed interval, and maximum observed gap | Pending |
| FEA-WATCH-MT-008 | The isolated preview package, QR session, Developer Mode version, and watch app launch are attributable without claiming an on-device hash receipt | Pending |
| FEA-WATCH-MT-009 | The logger page remains visible without screen interaction through the 120-second stationary observation | Pending |
| FEA-WATCH-MT-010 | Exit shows no symptom that the logger's finite page-bright override remains active outside the logger page | Pending |

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

Photographs and detailed device identifiers belong in the private evidence
repository. The public source repository should contain only a sanitized
result summary and the opaque DOC#5 reference.
