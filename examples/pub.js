'use strict'

const Nes = require('nes')

async function pub () {
  const client = new Nes.Client('ws://localhost:3001')
  await client.connect()

  console.log('pub connected')
  await client.request({
    path: '/echo',
    method: 'POST',
    payload: { hello: 'world' }
  })

  await client.disconnect()
}

pub()
