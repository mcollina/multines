'use strict'

const mqemitter = require('mqemitter')
const redis = require('mqemitter-redis')
const mongodb = require('mqemitter-mongodb')

const kDeliver = Symbol.for('deliver')

function register (server, options, next) {
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
    default:
      mq = options.mq || mqemitter(options)
  }

  function buildDeliver (socket, topic) {
    return function deliver (message, done) {
      if (topic === message.topic) {
        socket.publish('/' + topic, message.body, done)
      } else {
        socket.publish('/' + topic, message, done)
      }
    }
  }

  server.decorate('server', 'subscriptionFar', (path, options) => {
    options = options || {}

    const wrapSubscribe = options.onSubscribe || ((socket, path, params, next) => next())
    const wrapUnsubscribe = options.onUnsubscribe || ((socket, path, params, next) => next())

    options.onSubscribe = (socket, path, params, next) => {
      const deliverMap = socket[kDeliver] || {}
      socket[kDeliver] = deliverMap

      const topic = path.replace(/^\//, '')

      if (!deliverMap[path]) {
        deliverMap[path] = buildDeliver(socket, topic)
      }

      wrapSubscribe(socket, path, params, (err) => {
        if (err) {
          return next(err)
        }

        mq.on(topic, deliverMap[path], next)
      })
    }

    options.onUnsubscribe = (socket, path, params, next) => {
      wrapUnsubscribe(socket, path, params, (err) => {
        if (err) {
          return next(err)
        }

        const deliverMap = socket[kDeliver] || {}
        socket[kDeliver] = deliverMap

        if (!deliverMap[path]) {
          next()
          return
        }

        mq.removeListener(path.replace(/^\//, ''), deliverMap[path], function () {
          setImmediate(next)
        })
      })
    }

    server.subscription(path, options)
  })

  server.decorate('server', 'publishFar', (path, body) => {
    options = options || {}

    mq.emit({
      topic: path.replace(/^\//, ''), // the first is always a '/'
      body
    })
  })

  server.ext({
    type: 'onPostStop',
    method: function (event, done) {
      mq.close(function () {
        setImmediate(done)
      })
    }
  })

  next()
}

module.exports.register = register

register.attributes = {
  pkg: require('./package.json')
}
