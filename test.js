

var redis = require('redis'),
      redback = require('redback');


var redis_host = process.env.REDIS_HOST || 'localhost';
var redis_port = process.env.REDIS_PORT || 6379;
var redis_password = process.env.REDIS_PASSWORD;
var rc = redis.createClient(redis_port, redis_host);
if(redis_password){
  redclient.auth(redis_password);
}

redback.use(rc);

redback = redback.createClient();

var foo = redback.createHash('test_hash');

foo.set('foo', 'bar', function (err) {
    foo.get('foo', function (err, foo) {
        console.log(foo); //bar
    });
});