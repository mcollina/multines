# multines&nbsp;&nbsp;[![Build Status](https://travis-ci.org/mcollina/multines.svg)](https://travis-ci.org/mcollina/multines)

Multi-process [nes][nes] backend, turn [nes][nes] into a fully scalable solution.

**multines** connect multiple instances of [Hapi][hapi] and [nes][nes]
through an external pub/sub broker, currently only [redis][redis] and
[mongodb][mongodb] are supported.

**multines** is powered by [MQEmitter][mqemitter],
[MQEmitterRedis][mqredis] and [MQEmitterMongodb][mqmongo].

## Install

```
npm i hapi-pino --save
```

## Example

See the [examples](./examples/) folder.

## API

### Options

- `[type]` - `'redis'` or `'mongodb'`, if nothing is specified it will
  use the in-memory [MQEmitter][mqemitter]
- `[mq]` - an instance of [MQEmitter][mqemitter], if you do not want to
  leverage the embedded constructor

The `options` object is passed through to
[MQEmitterRedis][mqredis] and [MQEmitterMongodb][mqmongo], check their
documentation for broker-specific config.

## Acknowledgements

This project was kindly sponsored by [nearForm](http://nearform.com).

## License

MIT

[nes]: http://npm.im/nes
[redis]: http://redis.io
[redis]: http://www.mongodb.org
[mqemitter]: https://github.com/mcollina/mqmitter
[mqredis]: https://github.com/mcollina/mqmitter-redis
[mqmongo]: https://github.com/mcollina/mqmitter-mongodb
