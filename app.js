var jquery_url = 'http://code.jquery.com/jquery-1.5.min.js'


var request = require('request'),
    jsdom = require('jsdom')
    express = require('express'),
    _und = require('underscore'),
    app = express.createServer();

var KDVS = {
  url: "http://kdvs.org",
  library_url: "http://library.kdvs.org",
  jsdom: function(req, res, body, callback){
    jsdom.env({
      html: body,
      scripts: [jquery_url],
      done: function(err, window){
        return callback(req, res, err, window);
      }
    });
  },
  request_callback: function (error, response, body, req, res, callback) {
    if (error) {
      if( response.statusCode !== 200){
        console.log('Error when contacting ' + uri);
      } else {
        console.log('request error: ' + error);
      }
    };
    callback(req, res, body);
  },
  request: function(uri, req, res, callback){
    console.log('requesting ' + uri);
    request({ uri: uri  }, function(error, response, body){
      KDVS.request_callback(error, response, body, req, res, callback);
    });
  },
  news: {

    get: function(req, res){
      KDVS.news.request(req, res);
    },
    request: function(req, res){
      var uri = KDVS.url + '/';
      KDVS.request(uri, req, res, KDVS.news.response);      
    },
    extract: function(window){
      var $ = window.jQuery;
      var news = new Array();
      var news_dom = $('#content-content > div').children('div.view-content');
      
      //maybe do this with an _und.map iterator
      news_dom.children().each(function(index){
        news[index] = {
          "title": $(this).find('h2.title').text(),
          "content": $(this).find('div.content').text()
        };    
      });
      return news;
    },
    response: function(req, res, body){
      KDVS.jsdom(req, res, body, function(req, res, err, window ){
        res.send(JSON.stringify(KDVS.news.extract(window))); 
      });
    },
  },
  schedule: {
    get: function(req, res){
      KDVS.schedule.request(req, res, KDVS.schedule.response);
    },
    request: function(req, res, callback){
      var uri = KDVS.library_url + '/ajax/streamingScheduleJSON';
      KDVS.request(uri, req, res, callback);      
    },
    response: function(req, res, body){
      res.send(body); 
    },
  },
  show: {
    get: function(req, res){
      KDVS.show.request(req, res, KDVS.show.response);
    },
    request: function(req, res, callback){
      KDVS.schedule.request(req, res, callback);
    },
    response: function(req, res, body){
      var schedule = JSON.parse(body);
      var show = _und.find(schedule, function(show, key){
        return show.show_id == req.params.id;
      });
      res.send(JSON.stringify(show));
    },
  },
  playlist: {
    get: function(req, res){
      KDVS.playlist.request(req, res);
    },
    request: function(req, res){
      var uri = KDVS.url + '/show-info/' + req.params.show_id + '?date=' + req.params.date;
      KDVS.request(uri, req, res, KDVS.playlist.response);      
    },
    extract: function(window){
      var $ = window.jQuery;
      
      var show = {};
      
      //grab the show comments but be sure not to include image (which, isn't working)
      var comments = $('#show_info_right > p:not(:contains(img))').remove('img');
      show.comments = comments.html();
      show.image_url = $('img', comments).attr('src');
    
      var playlist = new Array();
      var table = ['track', 'artist', 'song', 'album', 'label', 'comments'];
      var tracks = $('table tr:has(td)'); //grab all rows from the table (except header)
      //replace this with a nice _und map function perhaps?
      tracks.each(function(n){
        row = $('td', this);
        if(row.size() == 1){ //airbreaks only have one td (with a colspan='6')
          playlist[n] = {airbreak: true};
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
    },
    response: function(req, res, body){
      KDVS.jsdom(req, res, body, function(req, res, err, window ){
        res.send(JSON.stringify(KDVS.playlist.extract(window))); 
      });
    },
  },
  history: {
    get: function(req, res){
      KDVS.history.request(req, res);
    },
    request: function(req, res){
      var uri = KDVS.url + '/show-history/' + req.params.show_id;
      KDVS.request(uri, req, res, KDVS.history.response);      
    },
    extract: function(window){
      var $ = window.jQuery;
      
      var show = {};
      
      var history = new Array();
      var shows = $('table tr:has(td)'); //grab all rows from the table (except header)
      //replace this with a nice _und map function perhaps?
      shows.each(function(n){
        row = $('td', this);
        
        date_time = row.eq(0).text().split('@');
        comments = row.eq(1).html(); 
        //we need to remove the View PLaylist link in the H4
        
        
        history[n] = {
          day: $.trim(date_time[0]),
          time: $.trim(date_time[1]),
          comments: comments, //get html of comments, and remove H4
          image_url: row.eq(2).children('img').attr('src')
        }
        
      });
      show.history = history;
      return show;
    },
    response: function(req, res, body){
      KDVS.jsdom(req, res, body, function(req, res, err, window ){
        res.send(JSON.stringify(KDVS.history.extract(window))); 
      });
    },
  },
}


app.use(express.logger());
app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));


app.get('/', KDVS.news.get);
app.get('/schedule', KDVS.schedule.get);
app.get('/show/:id', KDVS.show.get);
app.get('/show/:show_id/:date', KDVS.playlist.get);
app.get('/history/:show_id/', KDVS.history.get);


var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
console.log('Express server started on port %s', app.address().port);