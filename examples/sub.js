'use strict'

const Nes = require('nes')

const client = new Nes.Client('ws://localhost:3000')

client.connect((err) => {
  if (err) {
    console.error(err.message)
    process.exit(1)
  }

  console.log('connected')

  client.subscribe('/echo', (message) => {
    console.log(message)
  }, (err) => {
    if (err) {
      console.error(err.message)
      process.exit(1)
    }

    console.log('subscribed')
  })
})
