var redis = require('redis'),
      redback = require('redback'),
      rc = redis.createClient();

redback.use(rc);

redback = redback.createClient();

var foo = redback.createHash('test_hash');

foo.set('foo', 'bar', function (err) {
    foo.get('foo', function (err, foo) {
        console.log(foo); //bar
    });
});