'use strict'

const mqemitter = require('mqemitter')
const Code = require('code')
const Lab = require('lab')
const Hapi = require('@hapi/hapi')
const Nes = require('@hapi/nes')
const Multines = require('.')

const lab = exports.lab = Lab.script()
const experiment = lab.experiment
const test = lab.test
const beforeEach = lab.beforeEach
const afterEach = lab.afterEach
const expect = Code.expect

function getServer (port) {
  port = port || 4000
  const server = new Hapi.Server({ port: port })

  return server
}

async function start (server, opts) {
  opts = opts || {}

  const plugin = {
    plugin: {
      name: 'multines',
      register: Multines.register
    },
    options: opts
  }

  await server.register([Nes, plugin])

  server.subscriptionFar('/echo')
  server.route({
    path: '/echo',
    method: 'POST',
    handler: async (req, h) => {
      server.publishFar('/echo', req.payload)

      return req.payload
    }
  })

  await server.start()

  return server
}

function pubSubTest () {
  test('pub/sub', async () => {
    let done
    let error

    const client = new Nes.Client('ws://localhost:4000')
    await client.connect()

    function handler (message, flags) {
      expect(message).to.equal({ hello: 'world' })

      client.disconnect().then(done).catch(error)
    }

    const waitForHandler = new Promise((resolve, reject) => {
      done = resolve
      error = reject
    })

    await client.subscribe('/echo', handler)
    await Promise.all([
      client.request({
        path: '/echo',
        method: 'POST',
        payload: { hello: 'world' }
      }),
      waitForHandler
    ])
  })

  test('sub/unsub/pub', async () => {
    const client = new Nes.Client('ws://localhost:4000')
    await client.connect()

    const handler = (message) => {
      throw new Error('this should never happen')
    }

    await client.subscribe('/echo', handler)
    await client.unsubscribe('/echo', handler)

    await client.request({
      path: '/echo',
      method: 'POST',
      payload: { hello: 'world' }
    })

    await client.disconnect()
  })

  test('sub/disconnect/sub/pub', async () => {
    let client = new Nes.Client('ws://localhost:4000')
    let done
    let error

    await client.connect()
    await client.subscribe('/echo', (message) => {})
    await client.disconnect()

    client = new Nes.Client('ws://localhost:4000')
    await client.connect()

    function handler (message, flags) {
      expect(message).to.equal({ hello: 'world' })

      client.disconnect().then(done).catch(error)
    }

    const waitForHandler = new Promise((resolve, reject) => {
      done = resolve
      error = reject
    })

    await client.subscribe('/echo', handler)
    await Promise.all([
      client.request({
        path: '/echo',
        method: 'POST',
        payload: { hello: 'world' }
      }),
      waitForHandler
    ])
  })
}

function scalablePubSubTest () {
  test('scalable pub/sub', async () => {
    let done
    let error

    const client1 = new Nes.Client('ws://localhost:4000')
    const client2 = new Nes.Client('ws://localhost:4001')

    await client1.connect()
    await client2.connect()

    function handler (message, flags) {
      expect(message).to.equal({ hello: 'world' })

      client1.disconnect().then(done).catch(error)
    }

    const waitForHandler = new Promise((resolve, reject) => {
      done = resolve
      error = reject
    })

    await client1.subscribe('/echo', handler)
    await Promise.all([
      client2.request({
        path: '/echo',
        method: 'POST',
        payload: { hello: 'world' }
      }),
      waitForHandler
    ])
    await client2.disconnect()
  })
}

experiment('nes work as normal', async () => {
  let server

  beforeEach(async () => {
    server = await start(getServer())
  })

  afterEach(async () => {
    await server.stop()
    server = null
  })

  pubSubTest()
})

experiment('with shared mqemitter', () => {
  let server1
  let server2
  let mq

  beforeEach(async () => {
    mq = mqemitter()

    server1 = await start(getServer(), { mq: mq })
    server2 = await start(getServer(4001), { mq: mq })
  })

  afterEach(async () => {
    await server1.stop()
    server1 = null

    await server2.stop()
    server2 = null

    await new Promise((resolve, reject) => {
      mq.close((err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  })

  pubSubTest()
  scalablePubSubTest()

  test('remove the / at the beginning', async () => {
    let done
    let error

    const client = new Nes.Client('ws://localhost:4000')
    await client.connect()

    function handler (message, cb) {
      expect(message.body).to.equal({ hello: 'world' })
      mq.removeListener('echo', handler)
      cb()
      client.disconnect().then(done).catch(error)
    }

    mq.on('echo', handler)

    const waitForHandler = new Promise((resolve, reject) => {
      done = resolve
      error = reject
    })

    await Promise.all([
      client.request({
        path: '/echo',
        method: 'POST',
        payload: { hello: 'world' }
      }),
      waitForHandler
    ])
  })
})

experiment('with two redis mqemitter', () => {
  let server1
  let server2

  beforeEach(async () => {
    server1 = await start(getServer(), { type: 'redis' })
    server2 = await start(getServer(4001), { type: 'redis' })
  })

  afterEach(async () => {
    await server1.stop()
    await server2.stop()
    server2 = null
    server1 = null
  })

  pubSubTest()
  scalablePubSubTest()
})

experiment('with two mongodb mqemitter', () => {
  let server1
  let server2

  beforeEach(async () => {
    server1 = await start(getServer(), { type: 'redis' })
    server2 = await start(getServer(4001), { type: 'redis' })
  })

  afterEach(async () => {
    await server1.stop()
    await server2.stop()
    server2 = null
    server1 = null
  })

  pubSubTest()
  scalablePubSubTest()
})

experiment('wildcards', () => {
  let server

  beforeEach(async () => {
    server = getServer()

    const plugin = {
      name: 'multines',
      register: Multines.register
    }

    await server.register([Nes, plugin])

    server.subscriptionFar('/{parts*}')
    server.route({
      path: '/publish',
      method: 'POST',
      handler: (req) => {
        const topic = req.payload.topic
        const body = req.payload.body
        server.publishFar(topic, body)

        return { topic, body }
      }
    })

    await server.start()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('a + wildcard work', async () => {
    let done
    let error

    const client = new Nes.Client('ws://localhost:4000')
    await client.connect()

    const waitForHandler = new Promise((resolve, reject) => {
      done = resolve
      error = reject
    })

    await client.subscribe('/+', (message) => {
      expect(message).to.equal({ topic: 'hello', body: { hello: 'world' } })
      client.disconnect().then(done).catch(error)
    })

    await Promise.all([
      client.request({
        path: '/publish',
        method: 'POST',
        payload: { topic: 'hello', body: { hello: 'world' } }
      }),
      waitForHandler
    ])
  })

  test('a # wildcard work', async () => {
    let done
    let error

    const client = new Nes.Client('ws://localhost:4000')
    await client.connect()

    const waitForHandler = new Promise((resolve, reject) => {
      done = resolve
      error = reject
    })

    await client.subscribe('/#', (message) => {
      expect(message).to.equal({ topic: 'hello/new/world', body: { hello: 'world' } })
      client.disconnect().then(done).catch(error)
    })

    await Promise.all([
      client.request({
        path: '/publish',
        method: 'POST',
        payload: { topic: 'hello/new/world', body: { hello: 'world' } }
      }),
      waitForHandler
    ])
  })
})
