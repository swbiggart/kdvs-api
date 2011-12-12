
var jquery_url = 'http://code.jquery.com/jquery-1.5.min.js';

var request = require('request'),
    jsdom = require('jsdom')
    express = require('express'),
    _und = require('underscore'),
    app = express.createServer();

scrAPI = {
  url: 'http://kdvs.org',
  library_url: 'http://library.kdvs.org',

  get: function(uri, callback){
    console.log('getting');
    request({ uri: uri }, function(error, response, body){
      if (error) {
        if( response.statusCode !== 200){
          console.log('Error when contacting ' + uri);
        } else {
          console.log('request error: ' + error);
        }
      };
      jsdom.env({
        html: body,
        scripts: [jquery_url],
        done: function(err, window){
          callback(window); 
        }
      });
    });
  }
};


KDVS = {
  url: 'http://kdvs.org',
  news: function(req, res){
    var uri = KDVS.url + '/'
    scrAPI.get(uri, function(window){
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
      res.send(JSON.stringify(news));
    });
  },
  playlist: function(req, res){
    var uri = KDVS.url + '/show-info/' + req.params.show_id + '?date=' + req.params.date;
    scrAPI.get(uri, function(window){
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
      res.send(JSON.stringify(show));
    });
  },
  history: function(req, res){
    var uri = KDVS.url + '/show-history/' + req.params.show_id;
    scrAPI.get(uri, function(window){
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
      res.send(JSON.stringify(show));
    }); 
  }
}

app.use(express.logger());
app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));


app.get('/', KDVS.news);

//app.get('/schedule', KDVS.schedule.get);
//app.get('/show/:id', KDVS.show.get);
app.get('/show/:show_id/:date', KDVS.playlist);
app.get('/history/:show_id/', KDVS.history);


var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
console.log('Express server started on port %s', app.address().port);