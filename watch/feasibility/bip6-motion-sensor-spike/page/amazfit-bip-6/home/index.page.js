import {
  Accelerometer,
  FREQ_MODE_NORMAL,
  Gyroscope,
  VIBRATOR_SCENE_NOTIFICATION,
  Vibrator,
} from '@zos/sensor'
import {
  align,
  createWidget,
  prop,
  text_style,
  widget,
} from '@zos/ui'

import {
  STREAM_STATE,
  accelerationMagnitudeG,
  callbackRateHz,
  classifyAcquisition,
  dataAgeMs,
  formatAge,
  formatNumber,
  vectorMagnitude,
} from '../../../lib/telemetry.js'
import {
  createSensorChannelState,
  startSensorChannel,
  stopSensorChannel,
} from '../../../lib/sensor-channel.js'

const UI_REFRESH_MS = 500
const SELF_TEST_DISPLAY_MS = 5000

let runtime = null

function createRuntimeState() {
  const nowMs = Date.now()

  return {
    destroyed: false,
    refreshTimer: null,
    rateSnapshotMs: nowMs,
    selfTestUntilMs: 0,
    startedAtMs: nowMs,
    selfTestDetail: 'Visual and finite haptic output only',
    accelerometer: createSensorChannelState(),
    gyroscope: createSensorChannelState(),
    vibrator: null,
    widgets: {},
  }
}

function createText(y, height, text, size, color) {
  return createWidget(widget.TEXT, {
    x: 14,
    y,
    w: 362,
    h: height,
    color,
    text_size: size,
    align_h: align.CENTER_H,
    align_v: align.CENTER_V,
    text_style: text_style.ELLIPSIS,
    text,
  })
}

function setText(textWidget, text) {
  if (textWidget) {
    textWidget.setProperty(prop.MORE, { text })
  }
}

function createInterface() {
  runtime.widgets.prototype = createText(
    76,
    28,
    'Research prototype',
    22,
    0xffffff,
  )
  runtime.widgets.warning = createText(
    105,
    26,
    'NOT FOR MEDICAL USE',
    18,
    0xff6b6b,
  )
  runtime.widgets.banner = createText(
    137,
    28,
    'INITIALIZING SENSORS',
    20,
    0x5eead4,
  )
  runtime.widgets.assessment = createText(
    165,
    25,
    'No medical assessment active',
    16,
    0x9ca3af,
  )
  runtime.widgets.health = createText(
    199,
    30,
    'Waiting for sensor data',
    18,
    0xfbbf24,
  )
  runtime.widgets.accelerometer = createText(
    234,
    31,
    'ACC |a| -- g  -- Hz',
    20,
    0xffffff,
  )
  runtime.widgets.accelerometerAge = createText(
    264,
    24,
    'ACC data age: waiting',
    15,
    0x9ca3af,
  )
  runtime.widgets.gyroscope = createText(
    292,
    31,
    'GYRO |w| -- dps  -- Hz',
    20,
    0xffffff,
  )
  runtime.widgets.gyroscopeAge = createText(
    322,
    24,
    'GYRO data age: waiting',
    15,
    0x9ca3af,
  )

  runtime.widgets.selfTestButton = createWidget(widget.BUTTON, {
    x: 35,
    y: 353,
    w: 320,
    h: 54,
    radius: 14,
    normal_color: 0x0f766e,
    press_color: 0x115e59,
    color: 0xffffff,
    text_size: 19,
    text: 'RUN ALERT SELF-TEST',
    click_func: runAlertSelfTest,
  })

  runtime.widgets.footer = createText(
    412,
    27,
    'Closing the app stops both sensors',
    14,
    0x6b7280,
  )
}

function refreshCallbackRates(nowMs) {
  const elapsedMs = nowMs - runtime.rateSnapshotMs
  if (elapsedMs < UI_REFRESH_MS) {
    return
  }

  const channels = [runtime.accelerometer, runtime.gyroscope]
  for (const channel of channels) {
    channel.callbackRateHz = callbackRateHz(
      channel.callbackCount,
      channel.previousCount,
      nowMs,
      runtime.rateSnapshotMs,
    )
    channel.previousCount = channel.callbackCount
  }

  runtime.rateSnapshotMs = nowMs
}

function getStreamStates(nowMs) {
  return {
    accelerometer: classifyAcquisition(
      runtime.accelerometer.lastSampleMs,
      nowMs,
      runtime.startedAtMs,
    ),
    gyroscope: classifyAcquisition(
      runtime.gyroscope.lastSampleMs,
      nowMs,
      runtime.startedAtMs,
    ),
  }
}

function hasInactiveStream(streamStates) {
  return (
    runtime.accelerometer.error ||
    runtime.gyroscope.error ||
    streamStates.accelerometer === STREAM_STATE.STARTUP_TIMEOUT ||
    streamStates.gyroscope === STREAM_STATE.STARTUP_TIMEOUT ||
    streamStates.accelerometer === STREAM_STATE.STALE ||
    streamStates.gyroscope === STREAM_STATE.STALE ||
    streamStates.accelerometer === STREAM_STATE.INVALID_CLOCK ||
    streamStates.gyroscope === STREAM_STATE.INVALID_CLOCK
  )
}

function renderBanner(nowMs, streamStates) {
  if (nowMs < runtime.selfTestUntilMs) {
    setText(runtime.widgets.banner, 'ALERT UI SELF-TEST')
    setText(runtime.widgets.assessment, runtime.selfTestDetail)
    return
  }

  if (hasInactiveStream(streamStates)) {
    setText(runtime.widgets.banner, 'SENSOR STREAM NOT ACTIVE')
  } else if (
    streamStates.accelerometer === STREAM_STATE.STREAMING &&
    streamStates.gyroscope === STREAM_STATE.STREAMING
  ) {
    setText(runtime.widgets.banner, 'Monitoring: sensor stream only')
  } else {
    setText(runtime.widgets.banner, 'INITIALIZING SENSORS')
  }

  setText(runtime.widgets.assessment, 'No medical assessment active')
}

function renderHealth(streamStates) {
  if (runtime.accelerometer.error || runtime.gyroscope.error) {
    setText(runtime.widgets.health, 'Sensor unavailable - stop test')
    return
  }

  if (
    streamStates.accelerometer === STREAM_STATE.INVALID_CLOCK ||
    streamStates.gyroscope === STREAM_STATE.INVALID_CLOCK
  ) {
    setText(runtime.widgets.health, 'Sensor timing error - stop test')
    return
  }

  if (
    streamStates.accelerometer === STREAM_STATE.STARTUP_TIMEOUT ||
    streamStates.gyroscope === STREAM_STATE.STARTUP_TIMEOUT
  ) {
    setText(runtime.widgets.health, 'No sensor data - stop test')
    return
  }

  if (
    streamStates.accelerometer === STREAM_STATE.STALE ||
    streamStates.gyroscope === STREAM_STATE.STALE
  ) {
    setText(runtime.widgets.health, 'Sensor data stale - stop test')
    return
  }

  if (
    streamStates.accelerometer === STREAM_STATE.WAITING ||
    streamStates.gyroscope === STREAM_STATE.WAITING
  ) {
    setText(runtime.widgets.health, 'Waiting for sensor data')
    return
  }

  setText(runtime.widgets.health, 'Sensors streaming (foreground)')
}

function renderTelemetry(nowMs) {
  const accelerometerMagnitude = accelerationMagnitudeG(
    runtime.accelerometer.sample,
  )
  const gyroscopeMagnitude = vectorMagnitude(runtime.gyroscope.sample)
  const accelerometerAge = dataAgeMs(
    runtime.accelerometer.lastSampleMs,
    nowMs,
  )
  const gyroscopeAge = dataAgeMs(runtime.gyroscope.lastSampleMs, nowMs)

  setText(
    runtime.widgets.accelerometer,
    `ACC |a| ${formatNumber(accelerometerMagnitude, 3)} g  ${formatNumber(
      runtime.accelerometer.callbackRateHz,
      1,
    )} Hz`,
  )
  setText(
    runtime.widgets.accelerometerAge,
    `ACC data age: ${formatAge(accelerometerAge)}`,
  )
  setText(
    runtime.widgets.gyroscope,
    `GYRO |w| ${formatNumber(gyroscopeMagnitude, 1)} dps  ${formatNumber(
      runtime.gyroscope.callbackRateHz,
      1,
    )} Hz`,
  )
  setText(
    runtime.widgets.gyroscopeAge,
    `GYRO data age: ${formatAge(gyroscopeAge)}`,
  )
}

function refreshInterface() {
  if (!runtime || runtime.destroyed) {
    return
  }

  const nowMs = Date.now()
  const streamStates = getStreamStates(nowMs)
  refreshCallbackRates(nowMs)
  renderBanner(nowMs, streamStates)
  renderHealth(streamStates)
  renderTelemetry(nowMs)
}

function runAlertSelfTest() {
  if (!runtime || runtime.destroyed) {
    return
  }

  const nowMs = Date.now()
  if (nowMs < runtime.selfTestUntilMs) {
    return
  }

  runtime.selfTestUntilMs = nowMs + SELF_TEST_DISPLAY_MS
  runtime.selfTestDetail = 'Visual + finite haptic output only'

  try {
    if (!runtime.vibrator) {
      runtime.vibrator = new Vibrator()
    }
    runtime.vibrator.start({ mode: VIBRATOR_SCENE_NOTIFICATION })
  } catch (error) {
    runtime.selfTestDetail = 'Visual only - haptic unavailable'
    console.log('Alert UI self-test haptic unavailable')
  }

  refreshInterface()
}

function shutdownRuntime() {
  if (!runtime || runtime.destroyed) {
    return
  }

  runtime.destroyed = true

  if (runtime.refreshTimer !== null) {
    clearInterval(runtime.refreshTimer)
    runtime.refreshTimer = null
  }

  stopSensorChannel(runtime.accelerometer, (message) => console.log(message))
  stopSensorChannel(runtime.gyroscope, (message) => console.log(message))

  if (runtime.vibrator) {
    try {
      runtime.vibrator.stop()
    } catch (error) {
      console.log('Vibrator cleanup failed')
    }
    runtime.vibrator = null
  }
}

Page({
  build() {
    shutdownRuntime()
    runtime = createRuntimeState()
    createInterface()

    startSensorChannel(
      runtime.accelerometer,
      Accelerometer,
      FREQ_MODE_NORMAL,
      'Accelerometer',
      () => Date.now(),
      (message) => console.log(message),
    )
    startSensorChannel(
      runtime.gyroscope,
      Gyroscope,
      FREQ_MODE_NORMAL,
      'Gyroscope',
      () => Date.now(),
      (message) => console.log(message),
    )

    refreshInterface()
    runtime.refreshTimer = setInterval(refreshInterface, UI_REFRESH_MS)
  },

  onDestroy() {
    shutdownRuntime()
  },
})
