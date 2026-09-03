import {
  Accelerometer,
  FREQ_MODE_NORMAL,
  Gyroscope,
  VIBRATOR_SCENE_NOTIFICATION,
  Vibrator,
} from '@zos/sensor'
import {
  resetPageBrightTime,
  setPageBrightTime,
} from '@zos/display'
import {
  align,
  createWidget,
  prop,
  text_style,
  widget,
} from '@zos/ui'

import {
  accelerationMagnitudeG,
  acquisitionBannerText,
  acquisitionHealthText,
  callbackRateHz,
  classifyAcquisition,
  classifyCombinedAcquisition,
  dataAgeMs,
  formatCallbackStatistics,
  formatNumber,
  vectorMagnitude,
} from '../../../lib/telemetry.js'
import {
  ALERT_UI_SELF_TEST_TEXT,
  createAlertUiSelfTestLifetime,
} from '../../../lib/alert-ui-self-test.js'
import { createPageBrightLifetime } from '../../../lib/page-bright-lifetime.js'
import {
  createSensorChannelState,
  observeSensorChannelGap,
  startSensorChannel,
  stopSensorChannel,
} from '../../../lib/sensor-channel.js'

const UI_REFRESH_MS = 500

let runtime = null

function createRuntimeState() {
  const nowMs = Date.now()

  return {
    destroyed: false,
    refreshTimer: null,
    rateSnapshotMs: nowMs,
    startedAtMs: nowMs,
    accelerometer: createSensorChannelState(),
    gyroscope: createSensorChannelState(),
    alertUiSelfTest: createAlertUiSelfTestLifetime({
      createVibrator: () => {
        const vibrator = new Vibrator()
        return {
          start: () =>
            vibrator.start({ mode: VIBRATOR_SCENE_NOTIFICATION }),
          stop: () => vibrator.stop(),
        }
      },
      scheduleStop: (callback, delayMs) => setTimeout(callback, delayMs),
      cancelStop: (timerId) => clearTimeout(timerId),
      log: (message) => console.log(message),
    }),
    pageBrightLifetime: createPageBrightLifetime({
      setPageBrightTime,
      resetPageBrightTime,
      log: (message) => console.log(message),
    }),
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
    'n:0 age:-- dt:-- gap:--',
    13,
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
    'n:0 age:-- dt:-- gap:--',
    13,
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
    text: 'RUN ALERT UI SELF-TEST',
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

function refreshMaximumObservedGaps(nowMs) {
  observeSensorChannelGap(runtime.accelerometer, nowMs)
  observeSensorChannelGap(runtime.gyroscope, nowMs)
}

function getStreamStates(nowMs) {
  return {
    accelerometer: classifyAcquisition(
      runtime.accelerometer.lastSampleMs,
      nowMs,
      runtime.accelerometer.startedAtMs === null
        ? runtime.startedAtMs
        : runtime.accelerometer.startedAtMs,
    ),
    gyroscope: classifyAcquisition(
      runtime.gyroscope.lastSampleMs,
      nowMs,
      runtime.gyroscope.startedAtMs === null
        ? runtime.startedAtMs
        : runtime.gyroscope.startedAtMs,
    ),
  }
}

function renderBanner(nowMs, acquisitionState) {
  if (runtime.alertUiSelfTest.isVisualActive(nowMs)) {
    setText(runtime.widgets.banner, ALERT_UI_SELF_TEST_TEXT)
    setText(runtime.widgets.assessment, runtime.alertUiSelfTest.getDetail())
    return
  }

  setText(runtime.widgets.banner, acquisitionBannerText(acquisitionState))

  setText(runtime.widgets.assessment, 'No medical assessment active')
}

function renderHealth(acquisitionState) {
  setText(runtime.widgets.health, acquisitionHealthText(acquisitionState))
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
    formatCallbackStatistics(
      runtime.accelerometer.callbackCount,
      runtime.accelerometer.minimumCallbackIntervalMs,
      runtime.accelerometer.maximumCallbackIntervalMs,
      runtime.accelerometer.maximumObservedGapMs,
      accelerometerAge,
    ),
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
    formatCallbackStatistics(
      runtime.gyroscope.callbackCount,
      runtime.gyroscope.minimumCallbackIntervalMs,
      runtime.gyroscope.maximumCallbackIntervalMs,
      runtime.gyroscope.maximumObservedGapMs,
      gyroscopeAge,
    ),
  )
}

function refreshInterface() {
  if (!runtime || runtime.destroyed) {
    return
  }

  const nowMs = Date.now()
  const streamStates = getStreamStates(nowMs)
  const acquisitionState = classifyCombinedAcquisition(
    runtime.accelerometer,
    runtime.gyroscope,
    streamStates,
  )
  refreshCallbackRates(nowMs)
  refreshMaximumObservedGaps(nowMs)
  renderBanner(nowMs, acquisitionState)
  renderHealth(acquisitionState)
  renderTelemetry(nowMs)
}

function runAlertSelfTest() {
  if (!runtime || runtime.destroyed) {
    return
  }

  const nowMs = Date.now()
  if (!runtime.alertUiSelfTest.start(nowMs)) {
    return
  }

  refreshInterface()
}

function shutdownRuntime() {
  if (!runtime || runtime.destroyed) {
    return
  }

  runtime.destroyed = true

  runtime.alertUiSelfTest.cleanup()
  runtime.pageBrightLifetime.cleanup()

  if (runtime.refreshTimer !== null) {
    clearInterval(runtime.refreshTimer)
    runtime.refreshTimer = null
  }

  stopSensorChannel(runtime.accelerometer, (message) => console.log(message))
  stopSensorChannel(runtime.gyroscope, (message) => console.log(message))
}

Page({
  build() {
    shutdownRuntime()
    runtime = createRuntimeState()
    runtime.pageBrightLifetime.request()

    try {
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
    } catch (error) {
      shutdownRuntime()
      throw error
    }
  },

  onDestroy() {
    shutdownRuntime()
  },
})
