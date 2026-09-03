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
- package filename, version, and SHA-256;
- whether the watch is worn or held; and
- battery level and relevant power-saving mode.

## Procedure

1. From the app directory, run `npm run preview`. In Zepp Developer Mode's
   `Mini Program` tab, tap the QR/scanner icon at the upper right and scan the
   terminal QR code. Install version 0.1.1 on the paired Amazfit Bip 6.
2. Launch `Bip 6 Sensor Logger` and confirm both safety labels are visible.
   Confirm the banner initially says `INITIALIZING SENSORS` and does not say
   `Monitoring` before both streams are valid.
3. Hold the watch still for two minutes. Record the ACC/GYRO magnitudes,
   callback rates, callback counts, `dt`, `gap`, `age`, and sensor-health
   text at 5, 15, 30, 60, and 120 seconds. Record each stream separately.
   `dt` is the minimum/maximum completed callback interval; `gap` is the
   longest callback silence since session start, including a currently open
   silence; and `age` is the age of the most recent valid sensor value.
4. Make gentle ordinary wrist rotations for 30 seconds. Confirm values change
   and the screen never presents a health assessment.
5. Press `RUN ALERT SELF-TEST` once. Confirm the screen says
   `ALERT UI SELF-TEST`, haptic feedback is finite, and no medical event is
   asserted.
6. Press the button repeatedly during the five-second visual self-test. Confirm
   it does not restart or create continuous vibration.
7. Exit the app, wait 30 seconds, and launch it again. Confirm a fresh sensor
   startup, session counts/statistics reset, and no lingering haptic output.
8. Repeat launch/exit five times and record any crash, stale state, unavailable
   state, or unexpected behavior.
9. Uninstall the package when testing is complete.

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

The displayed timing values use local callback-arrival time. They are not
sensor-provided timestamps and do not establish synchronized samples or a
guaranteed sampling rate.

Photographs and detailed device identifiers belong in the private evidence
repository. The public source repository should contain only a sanitized
result summary and the opaque DOC#5 reference.
