import {
  callbackGapMs,
  callbackIntervalMs,
  isFiniteVector,
} from './telemetry.js'

export function createSensorChannelState(startedAtMs = null) {
  return {
    sensor: null,
    callback: null,
    active: false,
    startedAtMs,
    sample: null,
    lastSampleMs: null,
    callbackCount: 0,
    callbackRateHz: null,
    previousCount: 0,
    lastCallbackMs: null,
    minimumCallbackIntervalMs: null,
    maximumCallbackIntervalMs: null,
    maximumObservedGapMs: null,
    timingError: null,
    error: null,
  }
}

function recordCallbackTiming(channel, callbackTimeMs) {
  if (
    !Number.isFinite(callbackTimeMs) ||
    (Number.isFinite(channel.startedAtMs) &&
      callbackTimeMs < channel.startedAtMs) ||
    (channel.lastCallbackMs !== null &&
      (!Number.isFinite(channel.lastCallbackMs) ||
        callbackTimeMs < channel.lastCallbackMs))
  ) {
    return false
  }

  const intervalMs = callbackIntervalMs(
    channel.lastCallbackMs,
    callbackTimeMs,
  )
  if (intervalMs !== null) {
    channel.minimumCallbackIntervalMs =
      channel.minimumCallbackIntervalMs === null
        ? intervalMs
        : Math.min(channel.minimumCallbackIntervalMs, intervalMs)
    channel.maximumCallbackIntervalMs =
      channel.maximumCallbackIntervalMs === null
        ? intervalMs
        : Math.max(channel.maximumCallbackIntervalMs, intervalMs)
  }

  const completedGapMs = callbackGapMs(
    channel.lastCallbackMs,
    callbackTimeMs,
    channel.startedAtMs,
  )
  if (completedGapMs !== null) {
    channel.maximumObservedGapMs =
      channel.maximumObservedGapMs === null
        ? completedGapMs
        : Math.max(channel.maximumObservedGapMs, completedGapMs)
  }

  channel.lastCallbackMs = callbackTimeMs
  return true
}

export function observeSensorChannelGap(channel, nowMs) {
  const openGapMs = callbackGapMs(
    channel.lastCallbackMs,
    nowMs,
    channel.startedAtMs,
  )
  if (openGapMs === null) {
    return false
  }

  channel.maximumObservedGapMs =
    channel.maximumObservedGapMs === null
      ? openGapMs
      : Math.max(channel.maximumObservedGapMs, openGapMs)
  return true
}

export function stopSensorChannel(channel, log = () => {}) {
  channel.active = false

  if (!channel.sensor) {
    return
  }

  try {
    if (channel.callback) {
      channel.sensor.offChange(channel.callback)
    }
  } catch (error) {
    log('Sensor callback cleanup failed')
  }

  try {
    channel.sensor.stop()
  } catch (error) {
    log('Sensor stop failed')
  }

  channel.sensor = null
  channel.callback = null
}

export function startSensorChannel(
  channel,
  SensorType,
  frequencyMode,
  label,
  now = () => Date.now(),
  log = () => {},
) {
  try {
    if (channel.startedAtMs === null || channel.startedAtMs === undefined) {
      channel.startedAtMs = now()
    }
    if (!Number.isFinite(channel.startedAtMs)) {
      throw new Error('invalid sensor start time')
    }

    const sensor = new SensorType()
    const callback = () => {
      if (!channel.active) {
        return
      }

      if (channel.callbackCount < Number.MAX_SAFE_INTEGER) {
        channel.callbackCount += 1
      }

      try {
        const sampleTimeMs = now()
        if (!recordCallbackTiming(channel, sampleTimeMs)) {
          channel.timingError = `${label} callback timing invalid`
          return
        }

        const sample = sensor.getCurrent()
        if (!isFiniteVector(sample)) {
          channel.error = `${label} returned invalid data`
          return
        }

        channel.sample = {
          x: sample.x,
          y: sample.y,
          z: sample.z,
        }
        channel.lastSampleMs = sampleTimeMs
        channel.error = null
      } catch (error) {
        channel.error = `${label} read unavailable`
      }
    }

    channel.sensor = sensor
    channel.callback = callback
    sensor.onChange(callback)
    sensor.setFreqMode(frequencyMode)
    channel.active = true
    sensor.start()
    return true
  } catch (error) {
    channel.error = `${label} unavailable`
    stopSensorChannel(channel, log)
    log(`${label} could not be started`)
    return false
  }
}
