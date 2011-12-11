var jquery_url = 'http://code.jquery.com/jquery-1.5.min.js'

var request = require('request'),
    jsdom = require('jsdom');

var express = require('express'),
    app = express.createServer();
    
var KDVS = {
  url: "http://kdvs.org",
  library_url: "http://library.kdvs.org",
  jsdom: function(body, req, res, callback){
    jsdom.env({
      html: body,
      scripts: [jquery_url],
      done: function(err, window){
        return callback(err, window, res)
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
    KDVS.jsdom(body, req, res, callback);
  },
  request: function(uri, req, res, callback){
    console.log('requesting ' + uri);
    request({ uri: uri  }, function(error, response, body){
      KDVS.request_callback(error, response, body, req, res, callback);
    });
  },
  news: {
    dom_callback: function(err, window, res){
      res.send(JSON.stringify(KDVS.news.extract(window))); 
    },
    get: function(req, res){
      KDVS.news.request(req, res);
    },
    request: function(req, res){
      var uri = KDVS.url + '/';
      KDVS.request(uri, req, res, KDVS.news.dom_callback);      
    },
    extract: function(window){
      var $ = window.jQuery;
      var news = new Array();
      var news_dom = $('#content-content > div').children('div.view-content');
      news_dom.children().each(function(index){
        news[index] = {
          "title": $(this).find('h2.title').text(),
          "content": $(this).find('div.content').text()
        };    
      });
      return news;
    }
  },
  schedule: {
    response: function(err, window, res){
      res.send(JSON.stringify(window)); 
    },
    get: function(req, res){
      KDVS.schedule.request(req, res);
    },
    request: function(req, res){
      var uri = KDVS.library_url + '/ajax/streamingScheduleJSON';
      
      KDVS.request(uri, req, res, KDVS.schedule.response);      
    },
  }
  
}


app.use(express.logger());
app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));

app.get('/schedule/', KDVS.schedule.get);
app.get('/', KDVS.news.get);


var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
console.log('Express server started on port %s', app.address().port);