import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ALERT_UI_SELF_TEST_TEXT,
  HAPTIC_STOP_REQUEST_DELAY_MS,
  SELF_TEST_DISPLAY_MS,
  createAlertUiSelfTestLifetime,
} from '../lib/alert-ui-self-test.js'

function createHarness(overrides = {}) {
  const calls = []
  const timers = []
  const vibrator = {
    start() {
      calls.push(['start'])
    },
    stop() {
      calls.push(['stop'])
    },
  }

  const controller = createAlertUiSelfTestLifetime({
    createVibrator() {
      calls.push(['create'])
      return vibrator
    },
    scheduleStop(callback, delayMs) {
      const timerId = timers.length + 1
      timers.push({ callback, delayMs, timerId })
      calls.push(['schedule', timerId, delayMs])
      return timerId
    },
    cancelStop(timerId) {
      calls.push(['cancel', timerId])
    },
    log(message) {
      calls.push(['log', message])
    },
    ...overrides,
  })

  return { calls, controller, timers, vibrator }
}

test('FEA-WATCH-UT-025 schedules one nominal-delay haptic stop request', () => {
  const { calls, controller, timers } = createHarness()

  assert.equal(ALERT_UI_SELF_TEST_TEXT, 'Alert UI self-test')
  assert.equal(HAPTIC_STOP_REQUEST_DELAY_MS, 1000)
  assert.equal(controller.start(100), true)
  assert.equal(controller.isVisualActive(100 + SELF_TEST_DISPLAY_MS - 1), true)
  assert.deepEqual(
    calls.filter(([name]) => name === 'start' || name === 'schedule'),
    [
      ['start'],
      ['schedule', 1, HAPTIC_STOP_REQUEST_DELAY_MS],
    ],
  )
  assert.equal(controller.getDetail(), 'App stop timer set: 1.0 s')

  timers[0].callback()
  timers[0].callback()
  assert.equal(calls.filter(([name]) => name === 'stop').length, 1)
  assert.equal(controller.getDetail(), 'App haptic stop requested')
})

test('FEA-WATCH-UT-026 ignores repeated presses while the visual self-test is active', () => {
  const { calls, controller, timers } = createHarness()

  assert.equal(controller.start(1000), true)
  assert.equal(controller.start(1001), false)
  assert.equal(controller.start(1000 + SELF_TEST_DISPLAY_MS - 1), false)
  assert.equal(calls.filter(([name]) => name === 'start').length, 1)
  assert.equal(timers.length, 1)
})

test('FEA-WATCH-UT-027 cleanup cancels and stops once and is idempotent', () => {
  const { calls, controller, timers } = createHarness()

  assert.equal(controller.start(2000), true)
  controller.cleanup()
  controller.cleanup()
  timers[0].callback()

  assert.deepEqual(
    calls.filter(
      ([name]) => name === 'cancel' || name === 'stop',
    ),
    [
      ['cancel', 1],
      ['stop'],
    ],
  )
  assert.equal(controller.start(3000), false)
})

test('FEA-WATCH-UT-028 contains start and timer exceptions without retry', () => {
  let startCount = 0
  let stopCount = 0
  let scheduleCount = 0
  const startFailure = createAlertUiSelfTestLifetime({
    createVibrator: () => ({
      start() {
        startCount += 1
        throw new Error('simulated start failure')
      },
      stop() {
        stopCount += 1
      },
    }),
    scheduleStop() {
      scheduleCount += 1
      return 1
    },
    cancelStop() {},
  })

  assert.equal(startFailure.start(0), true)
  assert.equal(startFailure.start(1), false)
  startFailure.cleanup()
  assert.equal(startCount, 1)
  assert.equal(stopCount, 1)
  assert.equal(scheduleCount, 0)
  assert.equal(startFailure.getDetail(), 'Haptic fault - exit app')

  let timerStartCount = 0
  let timerStopCount = 0
  const timerFailure = createAlertUiSelfTestLifetime({
    createVibrator: () => ({
      start() {
        timerStartCount += 1
      },
      stop() {
        timerStopCount += 1
      },
    }),
    scheduleStop() {
      throw new Error('simulated timer failure')
    },
    cancelStop() {},
  })

  assert.equal(timerFailure.start(0), true)
  assert.equal(timerFailure.start(1), false)
  timerFailure.cleanup()
  assert.equal(timerStartCount, 1)
  assert.equal(timerStopCount, 1)
  assert.equal(timerFailure.getDetail(), 'Haptic timer fault - stop requested')
})

test('FEA-WATCH-UT-029 bounds a failed stop to one cleanup retry', () => {
  let stopCount = 0
  const stopHarness = createHarness({
    createVibrator: () => ({
      start() {},
      stop() {
        stopCount += 1
        throw new Error('simulated stop failure')
      },
    }),
  })

  assert.equal(stopHarness.controller.start(0), true)
  stopHarness.timers[0].callback()
  stopHarness.timers[0].callback()
  stopHarness.controller.cleanup()
  assert.equal(stopCount, 2)
  assert.equal(stopHarness.controller.getDetail(), 'Haptic fault - exit app')

  let recoveredStopCount = 0
  const recoveredOnCleanup = createHarness({
    createVibrator: () => ({
      start() {},
      stop() {
        recoveredStopCount += 1
        if (recoveredStopCount === 1) {
          throw new Error('simulated first stop failure')
        }
      },
    }),
  })

  assert.equal(recoveredOnCleanup.controller.start(0), true)
  recoveredOnCleanup.timers[0].callback()
  recoveredOnCleanup.controller.cleanup()
  recoveredOnCleanup.controller.cleanup()
  assert.equal(recoveredStopCount, 2)
  assert.equal(
    recoveredOnCleanup.controller.getDetail(),
    'Haptic fault - exit app',
  )

  let cancelCount = 0
  let cleanupStopCount = 0
  const cancelFailure = createAlertUiSelfTestLifetime({
    createVibrator: () => ({
      start() {},
      stop() {
        cleanupStopCount += 1
      },
    }),
    scheduleStop: () => 23,
    cancelStop() {
      cancelCount += 1
      throw new Error('simulated cancellation failure')
    },
  })

  assert.equal(cancelFailure.start(0), true)
  cancelFailure.cleanup()
  cancelFailure.cleanup()
  assert.equal(cancelCount, 1)
  assert.equal(cleanupStopCount, 1)
  assert.equal(cancelFailure.getDetail(), 'Haptic timer fault - stop requested')
})

test('FEA-WATCH-UT-030 contains synchronous and invalid timer results', () => {
  let synchronousStopCount = 0
  let synchronousCancelCount = 0
  const synchronousTimer = createAlertUiSelfTestLifetime({
    createVibrator: () => ({
      start() {},
      stop() {
        synchronousStopCount += 1
      },
    }),
    scheduleStop(callback) {
      callback()
      return 7
    },
    cancelStop() {
      synchronousCancelCount += 1
    },
  })

  assert.equal(synchronousTimer.start(0), true)
  synchronousTimer.cleanup()
  assert.equal(synchronousStopCount, 1)
  assert.equal(synchronousCancelCount, 0)
  assert.equal(
    synchronousTimer.getDetail(),
    'App haptic stop requested',
  )

  let invalidTimerStopCount = 0
  const invalidTimer = createAlertUiSelfTestLifetime({
    createVibrator: () => ({
      start() {},
      stop() {
        invalidTimerStopCount += 1
      },
    }),
    scheduleStop: () => undefined,
    cancelStop() {
      throw new Error('must not cancel an invalid timer identifier')
    },
  })

  assert.equal(invalidTimer.start(0), true)
  invalidTimer.cleanup()
  assert.equal(invalidTimerStopCount, 1)
  assert.equal(invalidTimer.getDetail(), 'Haptic timer fault - stop requested')

  let staleCallbackStopCount = 0
  const staleAfterCleanup = createHarness({
    createVibrator: () => ({
      start() {},
      stop() {
        staleCallbackStopCount += 1
      },
    }),
  })

  assert.equal(staleAfterCleanup.controller.start(0), true)
  staleAfterCleanup.controller.cleanup()
  staleAfterCleanup.timers[0].callback()
  assert.equal(staleCallbackStopCount, 1)

  const stalePriorCycle = createHarness()
  assert.equal(stalePriorCycle.controller.start(0), true)
  assert.equal(
    stalePriorCycle.controller.start(SELF_TEST_DISPLAY_MS),
    true,
  )
  assert.equal(
    stalePriorCycle.calls.filter(([name]) => name === 'stop').length,
    1,
  )
  stalePriorCycle.timers[0].callback()
  assert.equal(
    stalePriorCycle.calls.filter(([name]) => name === 'stop').length,
    1,
  )
  stalePriorCycle.timers[1].callback()
  assert.equal(
    stalePriorCycle.calls.filter(([name]) => name === 'stop').length,
    2,
  )
})
