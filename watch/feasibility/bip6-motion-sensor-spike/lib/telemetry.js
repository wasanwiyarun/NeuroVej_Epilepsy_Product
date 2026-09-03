export const ACCELERATION_CM_S2_PER_G = 980.665
export const STREAM_STALE_AFTER_MS = 2500
export const INITIAL_SAMPLE_TIMEOUT_MS = 5000

export const STREAM_STATE = Object.freeze({
  WAITING: 'waiting',
  STARTUP_TIMEOUT: 'startup-timeout',
  STREAMING: 'streaming',
  STALE: 'stale',
  INVALID_CLOCK: 'invalid-clock',
})

export const ACQUISITION_STATE = Object.freeze({
  TIMING_ERROR: 'timing-error',
  SENSOR_UNAVAILABLE: 'sensor-unavailable',
  STARTUP_TIMEOUT: 'startup-timeout',
  STALE: 'stale',
  WAITING: 'waiting',
  STREAMING: 'streaming',
})

export function classifyAcquisition(
  lastSampleMs,
  nowMs,
  startedAtMs,
  staleAfterMs = STREAM_STALE_AFTER_MS,
  initialSampleTimeoutMs = INITIAL_SAMPLE_TIMEOUT_MS,
) {
  if (lastSampleMs !== null && lastSampleMs !== undefined) {
    return classifyStream(lastSampleMs, nowMs, staleAfterMs)
  }

  if (
    !Number.isFinite(nowMs) ||
    !Number.isFinite(startedAtMs) ||
    nowMs < startedAtMs ||
    !Number.isFinite(initialSampleTimeoutMs) ||
    initialSampleTimeoutMs < 0
  ) {
    return STREAM_STATE.INVALID_CLOCK
  }

  return nowMs - startedAtMs >= initialSampleTimeoutMs
    ? STREAM_STATE.STARTUP_TIMEOUT
    : STREAM_STATE.WAITING
}

export function isFiniteVector(sample) {
  return Boolean(
    sample &&
      Number.isFinite(sample.x) &&
      Number.isFinite(sample.y) &&
      Number.isFinite(sample.z),
  )
}

export function vectorMagnitude(sample) {
  if (!isFiniteVector(sample)) {
    return null
  }

  return Math.sqrt(
    sample.x * sample.x + sample.y * sample.y + sample.z * sample.z,
  )
}

export function accelerationMagnitudeG(sample) {
  const magnitude = vectorMagnitude(sample)
  return magnitude === null ? null : magnitude / ACCELERATION_CM_S2_PER_G
}

export function dataAgeMs(lastSampleMs, nowMs) {
  if (
    lastSampleMs === null ||
    lastSampleMs === undefined ||
    !Number.isFinite(lastSampleMs) ||
    !Number.isFinite(nowMs) ||
    nowMs < lastSampleMs
  ) {
    return null
  }

  return nowMs - lastSampleMs
}

export function classifyStream(
  lastSampleMs,
  nowMs,
  staleAfterMs = STREAM_STALE_AFTER_MS,
) {
  if (lastSampleMs === null || lastSampleMs === undefined) {
    return STREAM_STATE.WAITING
  }

  if (
    !Number.isFinite(lastSampleMs) ||
    !Number.isFinite(nowMs) ||
    nowMs < lastSampleMs ||
    !Number.isFinite(staleAfterMs) ||
    staleAfterMs < 0
  ) {
    return STREAM_STATE.INVALID_CLOCK
  }

  return nowMs - lastSampleMs > staleAfterMs
    ? STREAM_STATE.STALE
    : STREAM_STATE.STREAMING
}

export function callbackRateHz(
  currentCount,
  previousCount,
  nowMs,
  previousMs,
) {
  if (
    !Number.isFinite(currentCount) ||
    !Number.isFinite(previousCount) ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(previousMs) ||
    currentCount < previousCount ||
    nowMs <= previousMs
  ) {
    return null
  }

  return ((currentCount - previousCount) * 1000) / (nowMs - previousMs)
}

export function callbackIntervalMs(previousCallbackMs, callbackTimeMs) {
  if (previousCallbackMs === null || previousCallbackMs === undefined) {
    return null
  }

  if (
    !Number.isFinite(previousCallbackMs) ||
    !Number.isFinite(callbackTimeMs) ||
    callbackTimeMs < previousCallbackMs
  ) {
    return null
  }

  return callbackTimeMs - previousCallbackMs
}

export function callbackGapMs(
  lastCallbackMs,
  nowMs,
  startedAtMs,
) {
  const gapStartMs =
    lastCallbackMs === null || lastCallbackMs === undefined
      ? startedAtMs
      : lastCallbackMs

  if (
    !Number.isFinite(gapStartMs) ||
    !Number.isFinite(nowMs) ||
    nowMs < gapStartMs
  ) {
    return null
  }

  return nowMs - gapStartMs
}

export function classifyCombinedAcquisition(
  accelerometer,
  gyroscope,
  streamStates,
) {
  if (
    accelerometer.timingError ||
    gyroscope.timingError ||
    streamStates.accelerometer === STREAM_STATE.INVALID_CLOCK ||
    streamStates.gyroscope === STREAM_STATE.INVALID_CLOCK
  ) {
    return ACQUISITION_STATE.TIMING_ERROR
  }

  if (accelerometer.error || gyroscope.error) {
    return ACQUISITION_STATE.SENSOR_UNAVAILABLE
  }

  if (
    streamStates.accelerometer === STREAM_STATE.STARTUP_TIMEOUT ||
    streamStates.gyroscope === STREAM_STATE.STARTUP_TIMEOUT
  ) {
    return ACQUISITION_STATE.STARTUP_TIMEOUT
  }

  if (
    streamStates.accelerometer === STREAM_STATE.STALE ||
    streamStates.gyroscope === STREAM_STATE.STALE
  ) {
    return ACQUISITION_STATE.STALE
  }

  if (
    streamStates.accelerometer === STREAM_STATE.WAITING ||
    streamStates.gyroscope === STREAM_STATE.WAITING
  ) {
    return ACQUISITION_STATE.WAITING
  }

  if (
    streamStates.accelerometer === STREAM_STATE.STREAMING &&
    streamStates.gyroscope === STREAM_STATE.STREAMING
  ) {
    return ACQUISITION_STATE.STREAMING
  }

  return ACQUISITION_STATE.SENSOR_UNAVAILABLE
}

export function acquisitionBannerText(acquisitionState) {
  if (acquisitionState === ACQUISITION_STATE.STREAMING) {
    return 'Monitoring: sensor stream only'
  }
  if (acquisitionState === ACQUISITION_STATE.WAITING) {
    return 'INITIALIZING SENSORS'
  }
  return 'SENSOR STREAM NOT ACTIVE'
}

export function acquisitionHealthText(acquisitionState) {
  switch (acquisitionState) {
    case ACQUISITION_STATE.TIMING_ERROR:
      return 'Sensor timing error - stop test'
    case ACQUISITION_STATE.SENSOR_UNAVAILABLE:
      return 'Sensor unavailable - stop test'
    case ACQUISITION_STATE.STARTUP_TIMEOUT:
      return 'No sensor data - stop test'
    case ACQUISITION_STATE.STALE:
      return 'Sensor data stale - stop test'
    case ACQUISITION_STATE.WAITING:
      return 'Waiting for sensor data'
    case ACQUISITION_STATE.STREAMING:
      return 'Sensors streaming (foreground)'
    default:
      return 'Sensor unavailable - stop test'
  }
}

export function formatNumber(value, decimalPlaces = 1) {
  if (!Number.isFinite(value)) {
    return '--'
  }

  return value.toFixed(decimalPlaces)
}

export function formatAge(ageMs) {
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 'waiting'
  }

  if (ageMs < 100) {
    return '<0.1 s'
  }

  return `${(ageMs / 1000).toFixed(1)} s`
}

export function formatCompactDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return '--'
  }

  if (durationMs < 1000) {
    return `${Math.min(999, Math.round(durationMs))}ms`
  }

  if (durationMs < 100000) {
    return `${(durationMs / 1000).toFixed(1)}s`
  }

  if (durationMs <= 999000) {
    return `${Math.round(durationMs / 1000)}s`
  }

  return '999s+'
}

export function formatIntervalRange(minimumMs, maximumMs) {
  if (
    !Number.isFinite(minimumMs) ||
    !Number.isFinite(maximumMs) ||
    minimumMs < 0 ||
    maximumMs < minimumMs
  ) {
    return '--'
  }

  return `${formatCompactDuration(minimumMs)}/${formatCompactDuration(
    maximumMs,
  )}`
}

export function formatCallbackStatistics(
  callbackCount,
  minimumIntervalMs,
  maximumIntervalMs,
  maximumGapMs,
  ageMs,
) {
  let count = '--'
  if (Number.isSafeInteger(callbackCount) && callbackCount >= 0) {
    count = callbackCount <= 999999 ? String(callbackCount) : '999999+'
  }

  return `n:${count} age:${formatCompactDuration(ageMs)} dt:${formatIntervalRange(
    minimumIntervalMs,
    maximumIntervalMs,
  )} gap:${formatCompactDuration(maximumGapMs)}`
}
