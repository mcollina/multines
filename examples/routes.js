'use strict'

const Nes = require('@hapi/nes')
const Multines = require('..')

module.exports = async (server) => {
  const plugin = {
    plugin: {
      name: 'multines',
      register: Multines.register
    },
    options: {
      type: 'redis'
    }
  }

  await server.register([Nes, plugin])

  server.subscriptionFar('/echo')
  server.route({
    path: '/echo',
    method: 'POST',
    handler: async (req, h) => {
      server.publishFar('/echo', req.payload)

      return req.payload
    }
  })

  return server
}
