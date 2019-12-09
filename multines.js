'use strict'

const util = require('util')
const mqemitter = require('mqemitter')
const redis = require('mqemitter-redis')
const mongodb = require('mqemitter-mongodb')

const kDeliver = Symbol.for('deliver')

function buildDeliver (socket, topic) {
  return async function deliver (message, done) {
    if (topic === message.topic) {
      await socket.publish('/' + topic, message.body).catch(() => {})
    } else {
      await socket.publish('/' + topic, message).catch(() => {})
    }
  }
}

function getMq (options) {
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

  return {
    removeListener: util.promisify(mq.removeListener.bind(mq)),
    on: util.promisify(mq.on.bind(mq)),
    emit: util.promisify(mq.emit.bind(mq)),
    close: util.promisify(mq.close.bind(mq))
  }
}

async function register (server, options) {
  server.dependency('@hapi/nes')
  const mq = getMq(options)

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
      await mq.on(topic, deliverMap[path])
    }

    options.onUnsubscribe = async (socket, path, params) => {
      await wrapUnsubscribe(socket, path, params)

      const deliverMap = socket[kDeliver] || {}
      socket[kDeliver] = deliverMap

      if (!deliverMap[path]) {
        return
      }

      await mq.removeListener(path.replace(/^\//, ''), deliverMap[path])
    }

    server.subscription(path, options)
  })

  server.decorate('server', 'publishFar', async (path, body) => {
    options = options || {}

    await mq.emit({
      topic: path.replace(/^\//, ''), // the first is always a '/'
      body
    })
  })

  server.ext('onPostStop', async () => {
    await mq.close()
  })
}

module.exports.register = register

register.attributes = {
  pkg: require('./package.json')
}
