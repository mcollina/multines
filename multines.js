'use strict'

const mqemitter = require('mqemitter')

function register (server, options, next) {
  server.dependency('nes')

  options.mq = options.mq || mqemitter()

  const mq = options.mq

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

  next()
}

module.exports.register = register

register.attributes = {
  pkg: require('./package.json')
}
