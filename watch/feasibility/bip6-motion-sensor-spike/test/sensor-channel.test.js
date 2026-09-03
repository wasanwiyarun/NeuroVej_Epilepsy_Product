import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createSensorChannelState,
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
  assert.equal(channel.error, 'Mock sensor returned invalid data')
  stopSensorChannel(channel)
})
