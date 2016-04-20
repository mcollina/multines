'use strict'

const Nes = require('nes')
const Multines = require('..')

module.exports = (server) => {
  const plugin = {
    register: Multines.register,
    options: {
      type: 'redis'
    }
  }

  server.register([Nes, plugin], (err) => {
    if (err) {
      throw err
    }
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
}
