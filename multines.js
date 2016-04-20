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

  server.decorate('server', 'subscriptionFar', (path, options) => {
    options = options || {}

    const toWrap = options.onSubscribe || ((socket, path, params, next) => next())

    options.onSubscribe = (socket, path, params, next) => {
      toWrap(socket, path, params, (err) => {
        if (err) {
          return next(err)
        }
        mq.on(path, function (message, done) {
          socket.publish(message.topic, message.body, done)
        }, next)
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

  server.ext('onPostStop', function (event, done) {
    mq.close(done)
  })

  next()
}

module.exports.register = register

register.attributes = {
  pkg: require('./package.json')
}
