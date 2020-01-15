'use strict'

const Hapi = require('@hapi/hapi')
const routes = require('./routes')

async function init () {
  const server = new Hapi.Server({ port: 3001 })

  await routes(server)
  await server.start()
  console.log('[b] server started')
}

init()
