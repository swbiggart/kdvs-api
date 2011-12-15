

var jquery_url = 'http://code.jquery.com/jquery-1.5.min.js';

var request = require('request'),
    jsdom = require('jsdom'),
    express = require('express'),
    _und = require('underscore'),
    memcache = require('memcache'),
    app = express.createServer();

//setup memcache client
var memclient = new memcache.Client(11211, 'localhost');
memclient.connect();

//function to grab the content of a page and return either a DOM to parse
//or the raw content (in the case of JSON, XML, etc)
function scrAPI(uri, callback, raw){

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

//KDVS API Namespace
var KDVS = {
  url: 'http://kdvs.org',
  library_url: 'http://library.kdvs.org',

  //function isn't used, was just the first test I made
  news: {
    get:  function(req, res){
      var uri = KDVS.url + '/';
      var lifetime = 60; //how long before scraping reset
      memclient.get(uri, function(error, result){
        if(error){
          console.log('memcache: error = ' + error);
        }
        if(result && result != 'NOT_STORED'){ //found in memcache
          console.log('memcache: found '+ uri);
          res.send(result);
        } else { //not in memchace
          scrAPI(uri, function(window){
            var json = JSON.stringify(KDVS.news.parser(window));
            memclient.set(uri, json, function(error, result){
              console.log('memcache: stored '+ uri);
              res.send(json);
            }, lifetime);
          });
        }
      });
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
  schedule: function(req, res){
    var uri = KDVS.library_url + '/ajax/streamingScheduleJSON';
    var raw = true;
    scrAPI(uri, function(body){res.send(body);}, raw);
  },
  show: function(req, res){
    var uri = KDVS.library_url + '/ajax/streamingScheduleJSON';
    var raw = true;
    scrAPI(uri, function(body){
      var schedule = JSON.parse(body);
      var show = _und.find(schedule, function(show, key){
        return show.show_id == req.params.show_id;
      });
      res.send(JSON.stringify(show));
    }, raw);
  },
  playlist: function(req, res){
    var uri = KDVS.url + '/show-info/' + req.params.show_id + '?date=' + req.params.date;
    scrAPI(uri, function(window){
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
      res.send(JSON.stringify(show));
    });
  },
  future: function(req, res){
	  var uri = KDVS.url + '/show-future/' + req.params.show_id;
	  scrAPI(uri, function(window){
	    res.send(JSON.stringify(KDVS.parse_history(window)));
	  });
  },
  past: function(req, res){
	  var uri = KDVS.url + '/show-history/' + req.params.show_id;
	  scrAPI(uri, function(window){
	    res.send(JSON.stringify(KDVS.parse_history(window)));
	  });
  },
  parse_history: function(window){
    var $ = window.jQuery;
    var history = [];
    var shows = $('table tr'); //grab all rows from the table (except header)
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

app.use(express.logger());
app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));

app.get('/', KDVS.news.get);
app.get('/schedule', KDVS.schedule);
app.get('/show/:show_id', KDVS.show);
app.get('/playlist/:show_id/:date', KDVS.playlist);
app.get('/past/:show_id', KDVS.past);
app.get('/future/:show_id', KDVS.future);

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
console.log('Express server started on port %s', app.address().port);