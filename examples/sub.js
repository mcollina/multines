'use strict'

const Nes = require('@hapi/nes')

async function sub () {
  const client = new Nes.Client('ws://localhost:3000')
  await client.connect()

  console.log('sub connected')
  client.subscribe('/echo', (message) => {
    console.log(message)
  })

  console.log('subscribed')
}

sub()
