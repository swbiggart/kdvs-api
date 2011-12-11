var jquery_url = 'http://code.jquery.com/jquery-1.5.min.js'

var request = require('request'),
    jsdom = require('jsdom');

var express = require('express'),
    app = express.createServer();
    
var KDVS = {
  url: "http://kdvs.org",
  request: function(command, req, res){
    var uri = KDVS.url + command;
    request({ uri: uri  }, function (error, response, body) {
      if (error && response.statusCode !== 200) {
        console.log('Error when contacting ' + uri)
      };
      jsdom.env({
        html: body,
        scripts: [jquery_url],
        done: function (err, window) {
          res.send(JSON.stringify(KDVS.news.extract(window)));
        }
      });
    });
  },
  news: {
    command: '/',
    get: function(req, res){
      KDVS.news.request(req, res);
    },
    request: function(req, res){
      KDVS.request(KDVS.news.command, req, res);      
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
  }
}


app.use(express.logger());
app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));


app.get('/', KDVS.news.get);

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
console.log('Express server started on port %s', app.address().port);