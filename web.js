

var jquery_url = 'http://code.jquery.com/jquery-1.5.min.js';

var request = require('request'),
    jsdom = require('jsdom'),
    express = require('express'),
    _und = require('underscore'),
    jquery = require('jquery'),
    mongoose = require('mongoose'),
    app = express.createServer();

//mongoose setup
var mongodb_url = process.env.MONGOHQ_URL || 'mongodb://localhost/kdvs';
mongoose.connect(mongodb_url);

var Schema = mongoose.Schema;

require('./models.js').make(Schema, mongoose);

//function to grab the content of a page and return either a DOM to parse
//or the raw content (in the case of JSON, XML, etc)
function scrAPI(uri, raw, callback){
  //if raw paramater passed, and true, callback on raw body
  raw = typeof raw != 'undefined' ? raw : false;

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

function respond(req, res, API, raw){
  //raw argument only passed when we do not want to convert content to DOM
  var raw = typeof raw != 'undefined' ? raw : false;
  
  var uri = API.uri(req);
  var model = API.model;
  
  model.find({}, function(error, result){
    if(error){
      console.log('mongo: error = ' + error);
    }
    console.log('found: ' + result);
    
    if(result && !jquery.isEmptyObject(result)){ //found
      console.log('mongo: found '+ uri);
      res.send(result);
    } else { //not in memchace
      scrAPI(uri, raw, function(window){
        var object = API.parser(window);
        model.create(object, function(error){
          console.log('save: ' + error);
          model.find({}, function(error, result){
            console.log('mongo: found '+ uri +' after save');
            res.send(result);
          });
        });
      });
    }
  });
}

//KDVS API Namespace
var KDVS = {
  url: 'http://kdvs.org',
  library_url: 'http://library.kdvs.org',
  
  news: {
    model: mongoose.model('News'),
    lifetime: 60,
    get: function(req, res){ respond(req, res, KDVS.news); },
    uri: function(req){ return KDVS.url + '/'; },
    key: function(req){ return 'news'; },
    parser: function(body){
      var $ = body.jQuery;
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
    model: mongoose.model('News'),
    lifetime: 60,
    get: function(req, res){ respond(req, res, KDVS.schedule, true); },
    uri: function(req){ return KDVS.library_url + '/ajax/streamingScheduleJSON'; },
    key: function(req){ return 'schedule'; },
    parser: function(body){return body;} 
  },
  show: {
    model: mongoose.model('Show'),
    lifetime: 60,
    get: function(req, res){ respond(req, res, KDVS.show, true); },
    uri: function(req){ return KDVS.library_url + '/ajax/streamingScheduleJSON'; },
    key: function(req){ return 'show'; },
    parser: function(body){
      var schedule = JSON.parse(body);
      var show = _und.find(schedule, function(show, key){
        return show.show_id == req.params.show_id;
      });
      return show;
    }
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
    future: {
      model: mongoose.model('Show'),
      lifetime: 60,
      get: function(req, res){ respond(req, res, KDVS.show, true); },
      uri: function(req){ return KDVS.library_url + '/ajax/streamingScheduleJSON'; },
      key: function(req){ return 'show'; },
      get: function(req, res){
        var uri = KDVS.url + '/show-future/' + req.params.show_id;
        var lifetime = 60;
        respond(req, res, uri, lifetime, KDVS.timeline.parser);
      },
    },
    past:{
      get: function(req, res){
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