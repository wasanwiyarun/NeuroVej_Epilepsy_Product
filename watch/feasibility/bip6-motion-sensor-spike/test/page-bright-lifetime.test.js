import assert from 'node:assert/strict'
import test from 'node:test'

import {
  FOREGROUND_OBSERVATION_BRIGHT_TIME_MS,
  createPageBrightLifetime,
} from '../lib/page-bright-lifetime.js'

test('FEA-WATCH-UT-018 requests the finite observation interval and resets it', () => {
  const calls = []
  const lifetime = createPageBrightLifetime({
    setPageBrightTime(option) {
      calls.push(['setPageBrightTime', option])
      return 0
    },
    resetPageBrightTime() {
      calls.push(['resetPageBrightTime'])
      return 0
    },
  })

  assert.equal(lifetime.request(), true)
  assert.equal(lifetime.request(), true)
  assert.deepEqual(calls, [
    [
      'setPageBrightTime',
      { brightTime: FOREGROUND_OBSERVATION_BRIGHT_TIME_MS },
    ],
  ])

  assert.equal(lifetime.cleanup(), true)
  assert.deepEqual(calls.at(-1), ['resetPageBrightTime'])
})

test('FEA-WATCH-UT-019 contains a request return-code failure and still resets', () => {
  const calls = []
  const messages = []
  const lifetime = createPageBrightLifetime({
    setPageBrightTime(option) {
      calls.push(['setPageBrightTime', option])
      return 5
    },
    resetPageBrightTime() {
      calls.push(['resetPageBrightTime'])
      return 0
    },
    log(message) {
      messages.push(message)
    },
  })

  assert.equal(lifetime.request(), false)
  assert.equal(lifetime.cleanup(), true)
  assert.deepEqual(
    calls.map(([name]) => name),
    ['setPageBrightTime', 'resetPageBrightTime'],
  )
  assert.deepEqual(messages, ['Finite page-bright request failed'])
})

test('FEA-WATCH-UT-020 contains a thrown request failure and still resets', () => {
  let resetCount = 0
  const messages = []
  const lifetime = createPageBrightLifetime({
    setPageBrightTime() {
      throw new Error('simulated request failure')
    },
    resetPageBrightTime() {
      resetCount += 1
      return 0
    },
    log(message) {
      messages.push(message)
    },
  })

  assert.equal(lifetime.request(), false)
  assert.equal(lifetime.cleanup(), true)
  assert.equal(resetCount, 1)
  assert.deepEqual(messages, ['Finite page-bright request failed'])
})

test('FEA-WATCH-UT-021 makes successful cleanup idempotent', () => {
  let resetCount = 0
  const lifetime = createPageBrightLifetime({
    setPageBrightTime() {
      return 0
    },
    resetPageBrightTime() {
      resetCount += 1
      return 0
    },
  })

  assert.equal(lifetime.request(), true)
  assert.equal(lifetime.cleanup(), true)
  assert.equal(lifetime.cleanup(), true)
  assert.equal(lifetime.request(), false)
  assert.equal(resetCount, 1)
})

test('FEA-WATCH-UT-022 contains a reset return-code failure idempotently', () => {
  let resetCount = 0
  const messages = []
  const lifetime = createPageBrightLifetime({
    setPageBrightTime() {
      return 0
    },
    resetPageBrightTime() {
      resetCount += 1
      return 5
    },
    log(message) {
      messages.push(message)
    },
  })

  assert.equal(lifetime.request(), true)
  assert.equal(lifetime.cleanup(), false)
  assert.equal(lifetime.cleanup(), false)
  assert.equal(resetCount, 1)
  assert.deepEqual(messages, ['Page-bright reset failed'])
})

test('FEA-WATCH-UT-023 contains a thrown reset failure idempotently', () => {
  let resetCount = 0
  const messages = []
  const lifetime = createPageBrightLifetime({
    setPageBrightTime() {
      return 0
    },
    resetPageBrightTime() {
      resetCount += 1
      throw new Error('simulated reset failure')
    },
    log(message) {
      messages.push(message)
    },
  })

  assert.equal(lifetime.request(), true)
  assert.equal(lifetime.cleanup(), false)
  assert.equal(lifetime.cleanup(), false)
  assert.equal(resetCount, 1)
  assert.deepEqual(messages, ['Page-bright reset failed'])
})

test('FEA-WATCH-UT-024 resets an initialized lifetime before any request', () => {
  let setCount = 0
  let resetCount = 0
  const lifetime = createPageBrightLifetime({
    setPageBrightTime() {
      setCount += 1
      return 0
    },
    resetPageBrightTime() {
      resetCount += 1
      return 0
    },
  })

  assert.equal(lifetime.cleanup(), true)
  assert.equal(lifetime.cleanup(), true)
  assert.equal(lifetime.request(), false)
  assert.equal(setCount, 0)
  assert.equal(resetCount, 1)
})
