'use strict'

const mqemitter = require('mqemitter')
const redis = require('mqemitter-redis')
const mongodb = require('mqemitter-mongodb')

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

  function buildDeliver (socket) {
    return function deliver (message, done) {
      socket.publish(message.topic, message.body, done)
    }
  }

  server.decorate('server', 'subscriptionFar', (path, options) => {
    options = options || {}

    const wrapSubscribe = options.onSubscribe || ((socket, path, params, next) => next())
    const wrapUnsubscribe = options.onUnubscribe || ((socket, path, params, next) => next())

    options.onSubscribe = (socket, path, params, next) => {
      let deliver = socket.__deliver

      if (!deliver) {
        deliver = socket.__deliver = buildDeliver(socket)
      }

      wrapSubscribe(socket, path, params, (err) => {
        if (err) {
          return next(err)
        }

        mq.on(path, deliver, next)
      })
    }

    options.onUnsubscribe = (socket, path, params, next) => {
      wrapUnsubscribe(socket, path, params, (err) => {
        if (err) {
          return next(err)
        }

        if (!socket.__deliver) {
          next()
          return
        }

        mq.removeListener(path, socket.__deliver, function () {
          setImmediate(next)
        })
      })
    }

    server.subscription(path, options)
  })

  server.decorate('server', 'publishFar', (path, message) => {
    options = options || {}

    mq.emit({
      topic: path,
      body: message
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
