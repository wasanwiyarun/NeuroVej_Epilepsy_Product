import { isFiniteVector } from './telemetry.js'

export function createSensorChannelState() {
  return {
    sensor: null,
    callback: null,
    active: false,
    sample: null,
    lastSampleMs: null,
    callbackCount: 0,
    callbackRateHz: null,
    previousCount: 0,
    error: null,
  }
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
    const sensor = new SensorType()
    const callback = () => {
      if (!channel.active) {
        return
      }

      channel.callbackCount += 1

      try {
        const sample = sensor.getCurrent()
        const sampleTimeMs = now()
        if (!isFiniteVector(sample) || !Number.isFinite(sampleTimeMs)) {
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
