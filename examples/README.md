# Multines with Redis

1. launch [redis](http://redis.io)
2. run `a.js` and `b.js`
3. run `sub.js`, which it will connect to `a.js` on port 3000 and
   it will subscribe to `'/echo'`
4. run `pub.js` at will, which it will connect to `b.js` on port 3001
   and it will call a POST on `'/echo'` which will trigger a publish
5. you should see your messages in the `sub.js` console
