
var jquery_url = 'http://code.jquery.com/jquery-1.5.min.js';

var request = require('request'),
    jsdom = require('jsdom')
    express = require('express'),
    _und = require('underscore'),
    app = express.createServer();
  

//working!
scrAPI = {
  url: 'http://kdvs.org',
  library_url: 'http://library.kdvs.org',

  
  request_http: function(uri, callback){
    console.log('requesting ' + uri);
    request({ uri: uri  }, function(error, response, body){
      scrAPI.request_callback(error, response, body, callback);
    });
  },
  
  request_callback: function (error, response, body, callback) {
    console.log('request_callback:');
    if (error) {
      if( response.statusCode !== 200){
        console.log('Error when contacting ' + uri);
      } else {
        console.log('request error: ' + error);
      }
    };
    callback(body);
  },
  
  extract: function(window){
    console.log('extract:');
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
  
  response: function(body, res, callback){
    console.log('response: ');
    jsdom.env({
      html: body,
      scripts: [jquery_url],
      done: function(err, window){
        console.log('jsdom done');
        res.send(JSON.stringify(callback(window))); 
      }
    });
  },
  /*
  get: function(req, res){
    console.log('getting');
    var uri = scrAPI.url + '/';
    scrAPI.request_http(uri, function(body){
      scrAPI.response(body, res, scrAPI.extract);
    });
  },*/
  get: function(uri, res, callback){
    console.log('getting');
    scrAPI.request_http(uri, function(body){
      scrAPI.response(body, res, scrAPI.extract);
    });
  }
};


KDVS = {
  news: function(req, res){
    var uri = 'http://kdvs.org/'
    scrAPI.get(uri, res, function(window){
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
    });
  }
}

app.use(express.logger());
app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));


app.get('/', KDVS.news);
/*
app.get('/schedule', KDVS.schedule.get);
app.get('/show/:id', KDVS.show.get);
app.get('/show/:show_id/:date', KDVS.playlist.get);
app.get('/history/:show_id/', KDVS.history.get);
*/

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
console.log('Express server started on port %s', app.address().port);