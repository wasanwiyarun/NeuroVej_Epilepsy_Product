import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createSensorChannelState,
  observeSensorChannelGap,
  startSensorChannel,
  stopSensorChannel,
} from '../lib/sensor-channel.js'

function createMockSensor(log, sample = { x: 1, y: 2, z: 3 }) {
  return class MockSensor {
    onChange(callback) {
      this.callback = callback
      log.push(['onChange', callback])
    }

    setFreqMode(mode) {
      log.push(['setFreqMode', mode])
    }

    start() {
      log.push(['start'])
    }

    getCurrent() {
      log.push(['getCurrent'])
      return sample
    }

    offChange(callback) {
      log.push(['offChange', callback])
    }

    stop() {
      log.push(['stop'])
    }
  }
}

test('FEA-WATCH-UT-008 starts, samples, and stops a sensor channel', () => {
  const calls = []
  const channel = createSensorChannelState()
  const MockSensor = createMockSensor(calls)

  assert.equal(
    startSensorChannel(channel, MockSensor, 7, 'Mock sensor', () => 1234),
    true,
  )
  assert.deepEqual(
    calls.slice(0, 3).map(([name]) => name),
    ['onChange', 'setFreqMode', 'start'],
  )

  const registeredCallback = calls[0][1]
  registeredCallback()
  assert.deepEqual(channel.sample, { x: 1, y: 2, z: 3 })
  assert.equal(channel.lastSampleMs, 1234)
  assert.equal(channel.callbackCount, 1)

  stopSensorChannel(channel)
  assert.equal(channel.active, false)
  assert.equal(channel.sensor, null)
  assert.equal(channel.callback, null)
  assert.equal(calls.at(-2)[0], 'offChange')
  assert.equal(calls.at(-2)[1], registeredCallback)
  assert.equal(calls.at(-1)[0], 'stop')

  registeredCallback()
  assert.equal(channel.callbackCount, 1)
})

test('FEA-WATCH-UT-009 fails visibly and cleans up after startup error', () => {
  const calls = []
  const messages = []

  class FailingSensor extends createMockSensor(calls) {
    start() {
      calls.push(['start'])
      throw new Error('simulated failure')
    }
  }

  const channel = createSensorChannelState()
  assert.equal(
    startSensorChannel(
      channel,
      FailingSensor,
      7,
      'Mock sensor',
      () => 1234,
      (message) => messages.push(message),
    ),
    false,
  )
  assert.equal(channel.error, 'Mock sensor unavailable')
  assert.equal(channel.active, false)
  assert.equal(channel.sensor, null)
  assert.deepEqual(
    calls.map(([name]) => name),
    ['onChange', 'setFreqMode', 'start', 'offChange', 'stop'],
  )
  assert.deepEqual(messages, ['Mock sensor could not be started'])
})

test('FEA-WATCH-UT-010 rejects invalid sample data without updating age', () => {
  const calls = []
  const channel = createSensorChannelState()
  const MockSensor = createMockSensor(calls, { x: 1, y: Number.NaN, z: 3 })

  startSensorChannel(channel, MockSensor, 7, 'Mock sensor', () => 1234)
  channel.callback()

  assert.equal(channel.sample, null)
  assert.equal(channel.lastSampleMs, null)
  assert.equal(channel.callbackCount, 1)
  assert.equal(channel.lastCallbackMs, 1234)
  assert.equal(channel.error, 'Mock sensor returned invalid data')
  stopSensorChannel(channel)
})

test('FEA-WATCH-UT-013 retains bounded callback interval and gap statistics', () => {
  const calls = []
  const callbackTimes = [1000, 1040, 1075, 1155]
  const channel = createSensorChannelState(900)
  const MockSensor = createMockSensor(calls)

  startSensorChannel(
    channel,
    MockSensor,
    7,
    'Mock sensor',
    () => callbackTimes.shift(),
  )
  channel.callback()
  channel.callback()
  channel.callback()
  channel.callback()

  assert.equal(channel.callbackCount, 4)
  assert.equal(channel.lastCallbackMs, 1155)
  assert.equal(channel.minimumCallbackIntervalMs, 35)
  assert.equal(channel.maximumCallbackIntervalMs, 80)
  assert.equal(channel.maximumObservedGapMs, 100)

  assert.equal(observeSensorChannelGap(channel, 1300), true)
  assert.equal(channel.maximumObservedGapMs, 145)
  assert.equal(observeSensorChannelGap(channel, 1100), false)
  assert.equal(channel.maximumObservedGapMs, 145)
  stopSensorChannel(channel)
})

test('FEA-WATCH-UT-014 rejects backward callback time without corrupting statistics', () => {
  const calls = []
  const callbackTimes = [1040, 1030, 1080]
  const channel = createSensorChannelState(1000)
  const MockSensor = createMockSensor(calls)

  startSensorChannel(
    channel,
    MockSensor,
    7,
    'Mock sensor',
    () => callbackTimes.shift(),
  )

  channel.callback()
  assert.equal(channel.lastSampleMs, 1040)
  assert.equal(channel.maximumObservedGapMs, 40)

  channel.callback()
  assert.equal(channel.callbackCount, 2)
  assert.equal(channel.lastCallbackMs, 1040)
  assert.equal(channel.lastSampleMs, 1040)
  assert.equal(channel.minimumCallbackIntervalMs, null)
  assert.equal(channel.maximumCallbackIntervalMs, null)
  assert.equal(channel.error, null)
  assert.equal(channel.timingError, 'Mock sensor callback timing invalid')

  channel.callback()
  assert.equal(channel.callbackCount, 3)
  assert.equal(channel.lastCallbackMs, 1080)
  assert.equal(channel.lastSampleMs, 1080)
  assert.equal(channel.minimumCallbackIntervalMs, 40)
  assert.equal(channel.maximumCallbackIntervalMs, 40)
  assert.equal(channel.maximumObservedGapMs, 40)
  assert.equal(channel.error, null)
  assert.equal(channel.timingError, 'Mock sensor callback timing invalid')
  stopSensorChannel(channel)
})

test('FEA-WATCH-UT-017 initializes and resets bounded session statistics', () => {
  const calls = []
  const callbackTimes = [500, 540]
  const channel = createSensorChannelState()
  const MockSensor = createMockSensor(calls)

  channel.callbackCount = Number.MAX_SAFE_INTEGER
  startSensorChannel(
    channel,
    MockSensor,
    7,
    'Mock sensor',
    () => callbackTimes.shift(),
  )
  channel.callback()

  assert.equal(channel.startedAtMs, 500)
  assert.equal(channel.lastCallbackMs, 540)
  assert.equal(channel.maximumObservedGapMs, 40)
  assert.equal(channel.callbackCount, Number.MAX_SAFE_INTEGER)
  stopSensorChannel(channel)

  const nextSession = createSensorChannelState(1000)
  assert.equal(nextSession.callbackCount, 0)
  assert.equal(nextSession.lastCallbackMs, null)
  assert.equal(nextSession.minimumCallbackIntervalMs, null)
  assert.equal(nextSession.maximumCallbackIntervalMs, null)
  assert.equal(nextSession.maximumObservedGapMs, null)
  assert.equal(nextSession.timingError, null)
})
