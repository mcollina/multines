'use strict'

const Hapi = require('hapi')

const server = new Hapi.Server()
server.connection({ port: 3000 })

require('./routes')(server)

server.start((err) => {
  if (err) {
    console.error(err.message)
    process.exit(1)
  }
  console.log('server started', server.info.uri)
})
