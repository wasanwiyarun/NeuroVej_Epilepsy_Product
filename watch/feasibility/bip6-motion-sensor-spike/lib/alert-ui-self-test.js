export const ALERT_UI_SELF_TEST_TEXT = 'Alert UI self-test'
export const SELF_TEST_DISPLAY_MS = 5000
export const HAPTIC_STOP_REQUEST_DELAY_MS = 1000

const ACTIVE_DETAIL = 'App stop timer set: 1.0 s'
const STOP_REQUESTED_DETAIL = 'App haptic stop requested'
const VISUAL_ONLY_DETAIL = 'Visual only - haptic unavailable'
const HAPTIC_FAULT_DETAIL = 'Haptic fault - exit app'
const TIMER_FAULT_DETAIL = 'Haptic timer fault - stop requested'

function validStartTime(nowMs) {
  return (
    Number.isSafeInteger(nowMs) &&
    nowMs >= 0 &&
    nowMs <= Number.MAX_SAFE_INTEGER - SELF_TEST_DISPLAY_MS
  )
}

export function createAlertUiSelfTestLifetime({
  createVibrator,
  scheduleStop,
  cancelStop,
  log = () => {},
}) {
  let cleaned = false
  let visualUntilMs = null
  let vibrator = null
  let stopTimerId = null
  let cycleSerial = 0
  let stopAttemptCount = 0
  let stopSucceeded = false
  let hapticFaultLatched = false
  let detail = VISUAL_ONLY_DETAIL

  function report(message) {
    try {
      log(message)
    } catch (error) {
      // Diagnostic failure must not interrupt haptic containment.
    }
  }

  function requestStop(allowCleanupRetry = false) {
    if (!vibrator || stopSucceeded) {
      return true
    }

    const maximumAttempts = allowCleanupRetry ? 2 : 1
    if (stopAttemptCount >= maximumAttempts) {
      return false
    }

    stopAttemptCount += 1
    try {
      vibrator.stop()
      stopSucceeded = true
      return true
    } catch (error) {
      hapticFaultLatched = true
      detail = HAPTIC_FAULT_DETAIL
      report('Alert UI self-test haptic stop request failed')
      return false
    }
  }

  function cancelScheduledStop() {
    if (stopTimerId === null) {
      return true
    }

    const timerId = stopTimerId
    stopTimerId = null
    try {
      cancelStop(timerId)
      return true
    } catch (error) {
      hapticFaultLatched = true
      detail = TIMER_FAULT_DETAIL
      report('Alert UI self-test haptic timer cancellation failed')
      return false
    }
  }

  function endVisualCycle() {
    visualUntilMs = null
    cancelScheduledStop()
    requestStop()
  }

  function isVisualActive(nowMs) {
    if (visualUntilMs === null) {
      return false
    }

    if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
      hapticFaultLatched = true
      detail = HAPTIC_FAULT_DETAIL
      report('Alert UI self-test display time invalid')
      return true
    }

    if (nowMs < visualUntilMs) {
      return true
    }

    endVisualCycle()
    return false
  }

  function start(nowMs) {
    if (cleaned || !validStartTime(nowMs)) {
      if (!cleaned) {
        hapticFaultLatched = true
        detail = HAPTIC_FAULT_DETAIL
        report('Alert UI self-test start time invalid')
      }
      return false
    }

    if (isVisualActive(nowMs)) {
      return false
    }

    visualUntilMs = nowMs + SELF_TEST_DISPLAY_MS
    cycleSerial += 1
    const scheduledCycleSerial = cycleSerial

    if (hapticFaultLatched) {
      return true
    }

    stopAttemptCount = 0
    stopSucceeded = false

    try {
      if (!vibrator) {
        vibrator = createVibrator()
      }
    } catch (error) {
      hapticFaultLatched = true
      detail = VISUAL_ONLY_DETAIL
      report('Alert UI self-test haptic unavailable')
      return true
    }

    try {
      vibrator.start()
    } catch (error) {
      hapticFaultLatched = true
      detail = HAPTIC_FAULT_DETAIL
      report('Alert UI self-test haptic start request failed')
      requestStop()
      return true
    }

    detail = ACTIVE_DETAIL
    let stopCallbackRan = false
    try {
      const timerId = scheduleStop(() => {
        if (cleaned || scheduledCycleSerial !== cycleSerial) {
          return
        }

        stopCallbackRan = true
        stopTimerId = null
        const stopRequested = requestStop()
        if (stopRequested && !hapticFaultLatched) {
          detail = STOP_REQUESTED_DETAIL
        }
      }, HAPTIC_STOP_REQUEST_DELAY_MS)
      if (
        !stopCallbackRan &&
        (!Number.isSafeInteger(timerId) || timerId < 0)
      ) {
        hapticFaultLatched = true
        detail = TIMER_FAULT_DETAIL
        report('Alert UI self-test haptic stop timer identifier invalid')
        requestStop()
      } else if (!stopCallbackRan) {
        stopTimerId = timerId
      }
    } catch (error) {
      hapticFaultLatched = true
      detail = TIMER_FAULT_DETAIL
      report('Alert UI self-test haptic stop timer unavailable')
      requestStop()
    }

    return true
  }

  function cleanup() {
    if (cleaned) {
      return
    }

    cleaned = true
    visualUntilMs = null
    cancelScheduledStop()
    requestStop(true)
    vibrator = null
  }

  return {
    cleanup,
    getDetail: () => detail,
    isVisualActive,
    start,
  }
}
