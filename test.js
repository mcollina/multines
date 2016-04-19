'use strict'

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

function getServer () {
  const server = new Hapi.Server()
  server.connection({ port: 3000 })
  return server
}

function register (server, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  const plugin = {
    register: Multines.register,
    options: opts
  }

  server.register([Nes, plugin], cb)

  return server
}

experiment('nes work as normal', () => {
  let server

  beforeEach((done) => {
    server = register(getServer(), (err) => {
      if (err) {
        return done(err)
      }

      // starting the server, needed to connect via nes
      server.start(done)
    })

    server.subscription('/echo')
    server.route({
      path: '/echo',
      method: 'POST',
      handler: (req, reply) => {
        server.publish('/echo', req.payload)
        reply(req.payload)
      }
    })
  })

  afterEach((done) => {
    server.stop(done)
    server = null
  })

  test('pub/sub', (done) => {
    var client = new Nes.Client('ws://localhost:3000')

    client.connect((err) => {
      if (err) {
        return done(err)
      }

      client.subscribe('/echo', (message) => {
        expect(message).to.deep.equal({ hello: 'world' })
        done()
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
