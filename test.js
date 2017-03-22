'use strict'

const mqemitter = require('mqemitter')
const Code = require('code')
const Lab = require('lab')
const Hapi = require('hapi')
const Nes = require('nes')
const Multines = require('.')

const lab = exports.lab = Lab.script()
const experiment = lab.experiment
const test = lab.test
const beforeEach = lab.beforeEach
const afterEach = lab.afterEach
const expect = Code.expect

function getServer (port) {
  port = port || 4000
  const server = new Hapi.Server()
  server.connection({ port: port })
  return server
}

function start (server, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  const plugin = {
    register: Multines.register,
    options: opts
  }

  server.register([Nes, plugin], (err) => {
    if (err) {
      return cb(err)
    }

    server.start(cb)
  })

  server.subscriptionFar('/echo')
  server.route({
    path: '/echo',
    method: 'POST',
    handler: (req, reply) => {
      server.publishFar('/echo', req.payload)
      reply(req.payload)
    }
  })

  return server
}

function pubSubTest () {
  test('pub/sub', (done) => {
    const client = new Nes.Client('ws://localhost:4000')

    client.connect((err) => {
      if (err) {
        return done(err)
      }

      client.subscribe('/echo', (message) => {
        expect(message).to.equal({ hello: 'world' })
        client.disconnect(() => setImmediate(done))
      }, (err) => {
        if (err) {
          return done(err)
        }

        client.request({
          path: '/echo',
          method: 'POST',
          payload: { hello: 'world' }
        }, (err) => {
          if (err) {
            return done(err)
          }
        })
      })
    })
  })

  test('sub/unsub/pub', (done) => {
    const client = new Nes.Client('ws://localhost:4000')

    client.connect((err) => {
      if (err) {
        return done(err)
      }

      const handler = (message) => {
        done(new Error('this should never happen'))
      }

      client.subscribe('/echo', handler, (err) => {
        if (err) {
          return done(err)
        }

        client.unsubscribe('/echo', handler, (err) => {
          if (err) {
            return done(err)
          }

          client.request({
            path: '/echo',
            method: 'POST',
            payload: { hello: 'world' }
          }, (err) => {
            if (err) {
              return done(err)
            }

            client.disconnect(() => setImmediate(done))
          })
        })
      })
    })
  })

  test('sub/disconnect/sub/pub', (done) => {
    let client = new Nes.Client('ws://localhost:4000')

    client.connect((err) => {
      if (err) {
        return done(err)
      }

      client.subscribe('/echo', (message) => {}, (err) => {
        if (err) {
          return done(err)
        }

        client.disconnect()

        client = new Nes.Client('ws://localhost:4000')

        client.connect((err) => {
          if (err) {
            return done(err)
          }

          client.subscribe('/echo', (message) => {
            expect(message).to.equal({ hello: 'world' })
            client.disconnect(() => setImmediate(done))
          }, (err) => {
            if (err) {
              return done(err)
            }

            client.request({
              path: '/echo',
              method: 'POST',
              payload: { hello: 'world' }
            }, (err) => {
              if (err) {
                return done(err)
              }
            })
          })
        })
      })
    })
  })
}

function scalablePubSubTest () {
  test('scalable pub/sub', (done) => {
    const client1 = new Nes.Client('ws://localhost:4000')
    const client2 = new Nes.Client('ws://localhost:4001')

    client1.connect((err) => {
      if (err) {
        return done(err)
      }

      client2.connect((err) => {
        if (err) {
          return done(err)
        }

        client1.subscribe('/echo', (message) => {
          expect(message).to.equal({ hello: 'world' })
          client1.disconnect(() => done())
        }, (err) => {
          if (err) {
            return done(err)
          }

          client2.request({
            path: '/echo',
            method: 'POST',
            payload: { hello: 'world' }
          }, (err) => {
            if (err) {
              return done(err)
            }

            client2.disconnect()
          })
        })
      })
    })
  })
}

experiment('nes work as normal', () => {
  let server

  beforeEach((done) => {
    server = start(getServer(), done)
  })

  afterEach((done) => {
    server.stop(done)
    server = null
  })

  pubSubTest()
})

experiment('with shared mqemitter', () => {
  let server1
  let server2
  let mq

  beforeEach((done) => {
    mq = mqemitter()

    server1 = start(getServer(), {
      mq: mq
    }, function (err) {
      if (err) {
        return done(err)
      }

      server2 = start(getServer(4001), {
        mq: mq
      }, done)
    })
  })

  afterEach((done) => {
    server1.stop((err) => {
      if (err) {
        return done(err)
      }
      server2.stop((err) => {
        if (err) {
          return done(err)
        }
        mq.close(done)
      })
      server2 = null
    })
    server1 = null
  })

  pubSubTest()
  scalablePubSubTest()

  test('remove the / at the beginning', (done) => {
    const client = new Nes.Client('ws://localhost:4000')

    client.connect((err) => {
      if (err) {
        return done(err)
      }

      const handler = (message, cb) => {
        expect(message.body).to.equal({ hello: 'world' })
        mq.removeListener('echo', handler)
        cb()
      }

      mq.on('echo', handler, (err) => {
        if (err) {
          return done(err)
        }

        client.request({
          path: '/echo',
          method: 'POST',
          payload: { hello: 'world' }
        }, (err) => {
          if (err) {
            return done(err)
          }

          client.disconnect(() => setImmediate(done))
        })
      })
    })
  })
})

experiment('with two redis mqemitter', () => {
  let server1
  let server2

  beforeEach((done) => {
    server1 = start(getServer(), {
      type: 'redis'
    }, function (err) {
      if (err) {
        return done(err)
      }

      server2 = start(getServer(4001), {
        type: 'redis'
      }, done)
    })
  })

  afterEach((done) => {
    server1.stop((err) => {
      if (err) {
        return done(err)
      }
      server2.stop(done)
      server2 = null
    })
    server1 = null
  })

  pubSubTest()
  scalablePubSubTest()
})

experiment('with two mongodb mqemitter', () => {
  let server1
  let server2

  beforeEach((done) => {
    server1 = start(getServer(), {
      type: 'redis'
    }, function (err) {
      if (err) {
        return done(err)
      }

      server2 = start(getServer(4001), {
        type: 'redis'
      }, done)
    })
  })

  afterEach((done) => {
    server1.stop((err) => {
      if (err) {
        return done(err)
      }
      server2.stop(done)
      server2 = null
    })
    server1 = null
  })

  pubSubTest()
  scalablePubSubTest()
})
