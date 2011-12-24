
var redis_namespace = 'kdvs';

//jquery script url to use with jsdom.  Seems wasteful since we require('jquery')
var jquery_url = 'http://code.jquery.com/jquery-1.5.min.js';

var request = require('request'),
    jsdom = require('jsdom'),
    express = require('express'),
    jquery = require('jquery'),
    _ = require('underscore'),
    redis = require('redis'),
    redback = require('redback'),
    kdvs = require('./lib/kdvs.js'),
    app = express.createServer();

//setup redis client
var redis_password = process.env.REDIS_PASSWORD;
if (process.env.REDISTOGO_URL) {
  var rtg = require("url").parse(process.env.REDISTOGO_URL);
  var redis_port = rtg.port;
  var redis_host = rtg.hostname;
  var redis_pass = rtg.auth.split(":")[1];
  var rc = redis.createClient(redis_port, redis_host);
  rc.auth(redis_pass);
  console.log('connected to redis with: ' + redis_pass + '-> ' + redis_host + ':' + redis_port);
} else {
  var rc = redis.createClient();
}

redback = redback.use(rc);

//function to grab the content of a page and return either a DOM to parse
//or the raw content (in the case of JSON, XML, etc)
function scrAPI(uri, callback, raw){
  //if raw paramater passed, and true, callback on raw body
  var raw = typeof raw != 'undefined' ? raw : false;

  console.log('requesting: ' + uri);

  request({ uri: uri }, function(error, response, body){
    if (error) {
      if( response.statusCode !== 200){
        console.log('Error when contacting ' + uri);
      } else {
        console.log('request error: ' + error);
      }
    } else { //no request errors
      if(!raw){ //parse the dom and attach jQuery 
        jsdom.env({
          html: body,
          scripts: [jquery_url],
          done: function(err, window){ callback(window); }
        });
      } else { //no dom to parse, probably native JSON or XML
        callback(body);
      }
    }
  });
}

function respond(req, res, uri, lifetime, parser, raw){
  //raw argument only passed when we do not want to convert content to DOM
  var raw = typeof raw != 'undefined' ? raw : false;
  

  
  var model = redback.createCache(redis_namespace);
  model.get(uri, function(error, result){
    if(error){
      console.log('redis: error = ' + error);
    }
    //console.log('redis result: ' + JSON.stringify(result));
    
    if(result && !jquery.isEmptyObject(result)){ //found in redis
      console.log('redis: found '+ uri);
      sendJSON(req, res, result);
    } else { //not in redis
      scrAPI(uri, function(window){
        var object = parser(window);
        var json = JSON.stringify(object);
        model.set(uri, json, lifetime, function(error, result){
          console.log('redis-store-error: ' + error);
          console.log('redis: stored '+ uri + ' expiring in ' + lifetime + ' seconds');
          sendJSON(req, res, json);
        });
      }, raw);
    }
  });
}

function sendJSON(req, res, json){
  var callback = req.query['callback'];
  if(callback){
    res.contentType('application/javascript');
    res.send(callback + '(' + json + ')');
  } else {
    res.contentType('application/json');
    res.send(json);
  }
}

var API = {
  url: 'http://kdvs.org',
  library_url: 'http://library.kdvs.org',
  root: function(req, res){
    var data = {
      message: "Welcome to the KDVS.fm API!",
      developer_url: "http://developer.kdvs.fm"      
    }
    
    res.send(JSON.stringify(data));
  },
  news:  function(req, res){
    var uri = API.url + '/';
    var lifetime = 60;
    respond(req, res, uri, lifetime, kdvs.news);
  },
  schedule: function(req, res){
    var uri = API.library_url + '/ajax/streamingScheduleJSON';
    var raw = true; //do not convert response to DOM
    var lifetime = 60;
    respond(req, res, uri, lifetime, function(body){
      var old_schedule = JSON.parse(body);
      var schedule = _.map(old_schedule, function(show, key){
        return show; //removing key
      });
      return schedule;
    }, raw);
  },
  show: function(req, res){
    var uri = API.library_url + '/ajax/streamingScheduleJSON' + '?show_id=' + req.params.show_id;
    var raw = true; //do not convert response to DOM
    var lifetime = 60;
    respond(req, res, uri, lifetime, function(body){
      var schedule = JSON.parse(body);
      var show = _.find(schedule, function(show, key){
        return show.show_id == req.params.show_id;
      });
      return show;
    },raw);
  },
  playlist: function(req, res){
    var uri = API.url + '/show-info/' + req.params.show_id + '?date=' + req.params.date;
    var lifetime = 60;
    respond(req, res, uri, lifetime, kdvs.playlist);
  },
  current: function(req, res){
    var uri = API.url + '/show-info/' + req.params.show_id;
    var lifetime = 60;
    respond(req, res, uri, lifetime, kdvs.playlist);
  },
  past: function(req, res){
    var uri = API.url + '/show-history/' + req.params.show_id;
    var lifetime = 60;
    respond(req, res, uri, lifetime, kdvs.timeline);
  },
  future: function(req, res){
    var uri = API.url + '/show-future/' + req.params.show_id;
    var lifetime = 60;
    respond(req, res, uri, lifetime, kdvs.timeline);
  },
}

app.use(express.logger());
app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));

app.get('/', API.root);
app.get('/news', API.news);
app.get('/schedule', API.schedule);
app.get('/show/:show_id([0-9]+)', API.show);
app.get('/show/:show_id([0-9]+)/playlist/:date', API.playlist);
app.get('/show/:show_id([0-9]+)/playlist', API.current);
app.get('/show/:show_id([0-9]+)/past', API.past);
app.get('/show/:show_id([0-9]+)/future', API.future);

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
console.log('Express server started on port %s', app.address().port);