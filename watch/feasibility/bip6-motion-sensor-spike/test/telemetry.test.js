import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ACCELERATION_CM_S2_PER_G,
  INITIAL_SAMPLE_TIMEOUT_MS,
  STREAM_STATE,
  accelerationMagnitudeG,
  callbackRateHz,
  classifyAcquisition,
  classifyStream,
  dataAgeMs,
  formatAge,
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
