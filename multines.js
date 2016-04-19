'use strict'

function register (server, options, next) {
  server.dependency('nes')
  setImmediate(next)
}

module.exports.register = register

register.attributes = {
  pkg: require('./package.json')
}
