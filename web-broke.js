var jquery_url = 'http://code.jquery.com/jquery-1.5.min.js'


var request = require('request'),
    jsdom = require('jsdom')
    express = require('express'),
    _und = require('underscore'),
    app = express.createServer();
  
  
function KDVS(){
  var url = "http://kdvs.org",
      library_url = "http://library.kdvs.org",
      jquery_url = 'http://code.jquery.com/jquery-1.5.min.js';
      
  var jsdom = function(req, res, body, callback){
    jsdom.env({
      html: body,
      scripts: [jquery_url],
      done: function(err, window){
        return callback(req, res, err, window);
      }
    });
  };
  
  var request_callback = function (error, response, body, req, res, callback) {
    if (error) {
      if( response.statusCode !== 200){
        console.log('Error when contacting ' + uri);
      } else {
        console.log('request error: ' + error);
      }
    };
    callback(req, res, body);
  };
  
  var request_http = function(uri, req, res, callback){
    console.log('requesting ' + uri);
    request({ uri: uri  }, function(error, response, body){
      this.request_callback(error, response, body, req, res, callback);
    });
  };
  
  var request = function(req, res){
    var uri = KDVS.url + '/';
    this.request_http(uri, req, res, this.response);      
  };
  
  var get = function(req, res){
    this.request(req, res);
  };
  var extract = function(window){
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
  };
  
  var response = function(req, res, body){
    KDVS.jsdom(req, res, body, function(req, res, err, window ){
      res.send(JSON.stringify(this.extract(window))); 
    });
  };
}

KDVS.prototype.news = function(){
  
};

app.use(express.logger());
app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));


app.get('/', KDVS.news.get);
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