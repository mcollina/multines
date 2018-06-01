'use strict'

const Hapi = require('hapi')
const routes = require('./routes')

async function init () {
  const server = new Hapi.Server({ port: 3000 })

  await routes(server)
  await server.start()
  console.log('[a] server started')
}

init()
