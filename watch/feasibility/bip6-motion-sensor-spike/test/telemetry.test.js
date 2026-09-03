import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ACQUISITION_STATE,
  ACCELERATION_CM_S2_PER_G,
  INITIAL_SAMPLE_TIMEOUT_MS,
  STREAM_STATE,
  accelerationMagnitudeG,
  acquisitionBannerText,
  acquisitionHealthText,
  callbackGapMs,
  callbackIntervalMs,
  callbackRateHz,
  classifyAcquisition,
  classifyCombinedAcquisition,
  classifyStream,
  dataAgeMs,
  formatAge,
  formatCallbackStatistics,
  formatCompactDuration,
  formatIntervalRange,
  formatNumber,
  isFiniteVector,
  vectorMagnitude,
} from '../lib/telemetry.js'

test('FEA-WATCH-UT-001 calculates vector and gravity magnitudes', () => {
  assert.equal(vectorMagnitude({ x: 3, y: 4, z: 12 }), 13)
  assert.equal(
    accelerationMagnitudeG({ x: 0, y: 0, z: ACCELERATION_CM_S2_PER_G }),
    1,
  )
})

test('FEA-WATCH-UT-002 rejects absent and non-finite sensor vectors', () => {
  assert.equal(isFiniteVector(null), false)
  assert.equal(isFiniteVector({ x: 1, y: 2, z: Number.NaN }), false)
  assert.equal(vectorMagnitude({ x: 1, y: 2 }), null)
  assert.equal(accelerationMagnitudeG({ x: Infinity, y: 0, z: 0 }), null)
})

test('FEA-WATCH-UT-003 classifies waiting, streaming, and stale data', () => {
  assert.equal(classifyStream(null, 1000), STREAM_STATE.WAITING)
  assert.equal(classifyStream(1000, 3500, 2500), STREAM_STATE.STREAMING)
  assert.equal(classifyStream(1000, 3501, 2500), STREAM_STATE.STALE)
})

test('FEA-WATCH-UT-004 times out when an initial sample never arrives', () => {
  assert.equal(classifyAcquisition(null, 1000, 0), STREAM_STATE.WAITING)
  assert.equal(
    classifyAcquisition(null, INITIAL_SAMPLE_TIMEOUT_MS, 0),
    STREAM_STATE.STARTUP_TIMEOUT,
  )
  assert.equal(
    classifyAcquisition(4900, INITIAL_SAMPLE_TIMEOUT_MS, 0),
    STREAM_STATE.STREAMING,
  )
})

test('FEA-WATCH-UT-005 fails safely when time inputs are invalid', () => {
  assert.equal(classifyStream(2000, 1000), STREAM_STATE.INVALID_CLOCK)
  assert.equal(classifyStream(Number.NaN, 1000), STREAM_STATE.INVALID_CLOCK)
  assert.equal(classifyAcquisition(null, 1000, 2000), STREAM_STATE.INVALID_CLOCK)
  assert.equal(dataAgeMs(2000, 1000), null)
})

test('FEA-WATCH-UT-006 derives a callback rate over an observation period', () => {
  assert.equal(callbackRateHz(40, 20, 2000, 1000), 20)
  assert.equal(callbackRateHz(20, 40, 2000, 1000), null)
  assert.equal(callbackRateHz(40, 20, 1000, 1000), null)
})

test('FEA-WATCH-UT-007 formats bounded display values', () => {
  assert.equal(formatNumber(1.234, 2), '1.23')
  assert.equal(formatNumber(Number.NaN), '--')
  assert.equal(formatAge(null), 'waiting')
  assert.equal(formatAge(50), '<0.1 s')
  assert.equal(formatAge(1250), '1.3 s')
})

test('FEA-WATCH-UT-011 calculates callback intervals and open gaps', () => {
  assert.equal(callbackIntervalMs(null, 1000), null)
  assert.equal(callbackIntervalMs(1000, 1000), 0)
  assert.equal(callbackIntervalMs(1000, 1040), 40)
  assert.equal(callbackIntervalMs(1040, 1000), null)

  assert.equal(callbackGapMs(null, 1250, 1000), 250)
  assert.equal(callbackGapMs(1200, 1250, 1000), 50)
  assert.equal(callbackGapMs(1300, 1250, 1000), null)
})

test('FEA-WATCH-UT-012 formats compact timing statistics', () => {
  assert.equal(formatCompactDuration(null), '--')
  assert.equal(formatCompactDuration(39.6), '40ms')
  assert.equal(formatCompactDuration(1250), '1.3s')
  assert.equal(formatIntervalRange(null, null), '--')
  assert.equal(formatIntervalRange(38, 42), '38ms/42ms')
  assert.equal(formatIntervalRange(42, 38), '--')
  assert.equal(
    formatCallbackStatistics(123, 38, 42, 80, 25),
    'n:123 age:25ms dt:38ms/42ms gap:80ms',
  )
  assert.equal(
    formatCallbackStatistics(Number.NaN, null, null, null, null),
    'n:-- age:-- dt:-- gap:--',
  )
})

test('FEA-WATCH-UT-015 gives timing faults safe presentation precedence', () => {
  const accelerometer = { error: null, timingError: 'clock moved backward' }
  const gyroscope = { error: 'read unavailable', timingError: null }
  const streamStates = {
    accelerometer: STREAM_STATE.STREAMING,
    gyroscope: STREAM_STATE.STALE,
  }

  const state = classifyCombinedAcquisition(
    accelerometer,
    gyroscope,
    streamStates,
  )
  assert.equal(state, ACQUISITION_STATE.TIMING_ERROR)
  assert.equal(
    acquisitionHealthText(state),
    'Sensor timing error - stop test',
  )
  assert.equal(acquisitionBannerText(state), 'SENSOR STREAM NOT ACTIVE')

  accelerometer.timingError = null
  assert.equal(
    classifyCombinedAcquisition(accelerometer, gyroscope, streamStates),
    ACQUISITION_STATE.SENSOR_UNAVAILABLE,
  )

  gyroscope.error = null
  streamStates.gyroscope = STREAM_STATE.WAITING
  assert.equal(
    classifyCombinedAcquisition(accelerometer, gyroscope, streamStates),
    ACQUISITION_STATE.WAITING,
  )
  assert.equal(
    acquisitionBannerText(ACQUISITION_STATE.WAITING),
    'INITIALIZING SENSORS',
  )

  streamStates.gyroscope = STREAM_STATE.STREAMING
  assert.equal(
    classifyCombinedAcquisition(accelerometer, gyroscope, streamStates),
    ACQUISITION_STATE.STREAMING,
  )
  assert.equal(
    acquisitionBannerText(ACQUISITION_STATE.STREAMING),
    'Monitoring: sensor stream only',
  )
})

test('FEA-WATCH-UT-016 bounds the compact statistics row', () => {
  const display = formatCallbackStatistics(
    Number.MAX_SAFE_INTEGER,
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    Number.MAX_VALUE,
  )
  assert.equal(
    display,
    'n:999999+ age:999s+ dt:999s+/999s+ gap:999s+',
  )
  assert.ok(display.length <= 48)
  assert.ok(display.indexOf('age:') < display.indexOf('dt:'))

  const widestDisplay = formatCallbackStatistics(
    Number.MAX_SAFE_INTEGER,
    99950,
    99950,
    99950,
    99950,
  )
  assert.equal(
    widestDisplay,
    'n:999999+ age:100.0s dt:100.0s/100.0s gap:100.0s',
  )
  assert.equal(widestDisplay.length, 48)
  assert.equal(formatCompactDuration(120000), '120s')
})
