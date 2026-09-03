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
