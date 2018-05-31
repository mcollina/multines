'use strict'

const util = require('util')
const mqemitter = require('mqemitter')
const redis = require('mqemitter-redis')
const mongodb = require('mqemitter-mongodb')

const kDeliver = Symbol.for('deliver')

function buildDeliver (socket, topic) {
  return async function deliver (message, done) {
    if (topic === message.topic) {
      await socket.publish('/' + topic, message.body)
    } else {
      await socket.publish('/' + topic, message)
    }
  }
}

async function register (server, options) {
  server.dependency('nes')

  let mq

  switch (options.type) {
    case 'redis':
      mq = redis(options)
      break
    case 'mongo':
    case 'mongodb':
      mq = mongodb(options)
      break
    default: {
      mq = options.mq || mqemitter(options)
    }
  }

  server.decorate('server', 'subscriptionFar', (path, options) => {
    options = options || {}

    const wrapSubscribe = options.onSubscribe || (async (socket, path, params) => null)
    const wrapUnsubscribe = options.onUnsubscribe || (async (socket, path, params) => null)

    options.onSubscribe = async (socket, path, params) => {
      const deliverMap = socket[kDeliver] || {}
      socket[kDeliver] = deliverMap

      const topic = path.replace(/^\//, '')

      if (!deliverMap[path]) {
        deliverMap[path] = buildDeliver(socket, topic)
      }

      await wrapSubscribe(socket, path, params)
      await util.promisify(mq.on.bind(mq))(topic, deliverMap[path])
    }

    options.onUnsubscribe = async (socket, path, params) => {
      await wrapUnsubscribe(socket, path, params)

      const deliverMap = socket[kDeliver] || {}
      socket[kDeliver] = deliverMap

      if (!deliverMap[path]) {
        return
      }

      await util.promisify(mq.removeListener.bind(mq))(path.replace(/^\//, ''), deliverMap[path])
    }

    server.subscription(path, options)
  })

  server.decorate('server', 'publishFar', async (path, body) => {
    options = options || {}

    await util.promisify(mq.emit.bind(mq))({
      topic: path.replace(/^\//, ''), // the first is always a '/'
      body
    })
  })

  server.ext('onPostStop', async () => {
    await util.promisify(mq.close.bind(mq))()
  })
}

module.exports.register = register

register.attributes = {
  pkg: require('./package.json')
}
