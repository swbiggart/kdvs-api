
var redis_namespace = 'kdvs';
var jquery_url = 'http://code.jquery.com/jquery-1.5.min.js';

var request = require('request'),
    jsdom = require('jsdom'),
    express = require('express'),
    _und = require('underscore'),
    jquery = require('jquery'),
    redis = require('redis'),
    redback = require('redback'),
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
//redback = redback.createClient();

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
      if(!raw){ //parse the dom and attach jQuery ($)
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
  
  //we are always passing json
  res.contentType('application/json');
  
  var model = redback.createCache(redis_namespace);
  model.get(uri, function(error, result){
    if(error){
      console.log('redis: error = ' + error);
    }
    //console.log('redis result: ' + JSON.stringify(result));
    
    if(result && !jquery.isEmptyObject(result)){ //found in memcache
      console.log('redis: found '+ uri);
      res.send(result);
    } else { //not in memchace
      scrAPI(uri, function(window){
        var object = parser(window);
        var json = JSON.stringify(object);
        model.set(uri, json, lifetime, function(error, result){
          console.log('redis-store-error: ' + error);
          console.log('redis: stored '+ uri + ' expiring in ' + lifetime + ' seconds');
          res.send(json);
        });
      }, raw);
    }
  });
}

//KDVS API Namespace
var KDVS = {
  url: 'http://kdvs.org',
  library_url: 'http://library.kdvs.org',
  
  news: {
    get:  function(req, res){
      var uri = KDVS.url + '/';
      var lifetime = 60;
      respond(req, res, uri, lifetime, KDVS.news.parser);
    },
    parser: function(window){
      var $ = window.jQuery;
      var news = [];
      //maybe do this with an _und.map iterator
      $('.teaser-inner').each(function(i){
        news[i] = {
          "title": $(this).find('h2.title').text(),
          "content": $(this).find('div.content').html()
        };    
      });
      return news;
    }
  },
  schedule: {
    get: function(req, res){
      var uri = KDVS.library_url + '/ajax/streamingScheduleJSON';
      var raw = true; //do not convert response to DOM
      var lifetime = 60;
      respond(req, res, uri, lifetime, function(body){return body;}, raw);
    } 
  },
  show: {
    get: function(req, res){
      var uri = KDVS.library_url + '/ajax/streamingScheduleJSON' + '?show_id=' + req.params.show_id;
      var raw = true; //do not convert response to DOM
      var lifetime = 60;
      respond(req, res, uri, lifetime, function(body){
        var schedule = JSON.parse(body);
        var show = _und.find(schedule, function(show, key){
          return show.show_id == req.params.show_id;
        });
        return show;
      },raw);
    },
  },
  playlist:{
    get: function(req, res){
      var uri = KDVS.url + '/show-info/' + req.params.show_id + '?date=' + req.params.date;
      var lifetime = 60;
      respond(req, res, uri, lifetime, KDVS.playlist.parser);
    },
    parser:function(window){
      var $ = window.jQuery;
      var show = {};

      //grab the show comments and extract the image
      var comments = $('#show_info_right > p');
      show.comments = comments.clone().find('img').remove().end().html(); 
      show.image_url = $('img', comments).attr('src');

      var playlist = new Array();
      var table = ['track', 'artist', 'song', 'album', 'label', 'comments'];
      var tracks = $('table tr:has(td)'); //grab all rows from the table (except header)
      //replace this with a nice _und map function perhaps?
      tracks.each(function(n){
        row = $('td', this);
        if(row.size() == 1){ //airbreaks only have one td (with a colspan='6')
          playlist.push({airbreak: true});
        } else { //track
          //this could be done with a nice _und map or reduce function I think
          playlist[n] = {};
          for(i in table){
            playlist[n][table[i]] = row.eq(i).text().trim();
          }
          playlist[n]['airbreak'] = false;
        }
      });
      show.playlist = playlist
      return show;
    }
  },
  timeline: {
    get: {
      future: function(req, res){
        var uri = KDVS.url + '/show-future/' + req.params.show_id;
        var lifetime = 60;
        respond(req, res, uri, lifetime, KDVS.timeline.parser);
      },
      past: function(req, res){
        var uri = KDVS.url + '/show-history/' + req.params.show_id;
        var lifetime = 60;
        respond(req, res, uri, lifetime, KDVS.timeline.parser);
      },
    },
    parser: function(window){
      var $ = window.jQuery;
      var history = [];
      var shows = $('table tr'); //grab all rows from the table
      //replace this with a nice _und map function perhaps?
      shows.each(function(){
        var row = $('td', this);
        var date_time = row.eq(0).text().split('@'); //only temporary until I start caching data about shows
        history.push({
          day: $.trim(date_time[0]),
          time: $.trim(date_time[1]),
          comments: row.eq(1).clone().find('h4').remove().end().html(),
          image_url: row.eq(2).children('img').attr('src')
        });
      });
      return history; 
    }
  }
}

app.use(express.logger());
app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));

app.get('/', KDVS.news.get);
app.get('/schedule', KDVS.schedule.get);
app.get('/show/:show_id', KDVS.show.get);
app.get('/playlist/:show_id/:date', KDVS.playlist.get);
app.get('/past/:show_id', KDVS.timeline.get.past);
app.get('/future/:show_id', KDVS.timeline.get.future);

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
console.log('Express server started on port %s', app.address().port);