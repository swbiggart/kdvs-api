//KDVS Parser

var _ = require('underscore'),
    $ = require('jquery');

exports.news = function(window){
  var $ = window.jQuery;
  var news = [];
  console.log('parsing news');
  //maybe do this with an _.map iterator
  $('.teaser-inner').each(function(i){
    news[i] = {
      "title": $(this).find('h2.title').text(),
      "content": $(this).find('div.content').html()
    };    
  });
  return news;
};
exports.schedule = function(body){
  var shows = JSON.parse(body);
  shows = _(shows).map(function(show, key){
    //turn dj_names string into an array and trim whitespace
    show.djs = _(show.dj_names.split('&')).map(function(dj){
      return $.trim(dj);
    });
    delete show.dj_names; //remove dj_names string
    
    //add start and end times that are easy for javascript to use
    show.start_time = new Date(0,0,0,show.start_hour, show.start_min);
    show.end_time = new Date(0,0,0,show.end_hour, show.end_min);
    show.minutes = (show.end_time - show.start_time) / 1000 / 60; //time diff in min
    if(show.minutes < 0){
      show.minutes = show.minutes + 24 * 60; //to deal with midnight = 00:00
    }
    return show; //removing key
  });
  
  shows = _(shows).sortBy(function(show){
    //sorting by start time then dotw to make building schedule grid easier
    return show.dotw + show.start_time;
  })
  
  //now we need to turn the shows into events to account for alternates
  var schedule = [];
  var event_count = 0;
  for(i in shows){
    //determine if previous show started at the same time, if so append to last event        
    if(i > 0 && shows[i].start_time.getTime() == shows[i-1].start_time.getTime()){
      schedule[event_count-1].shows.push(shows[i]);
    } else { //add to the next event
      schedule[event_count++] = {
        dotw: shows[i].dotw,
        start_time: shows[i].start_time,
        end_time: shows[i].end_time,
        minutes: shows[i].minutes,
        shows: [shows[i]]
      };
    }
  }
  return schedule;
};
exports.playlist = function(window){
  var $ = window.jQuery;
  var show = {};

  var djs = $('#show_info_left b');
  show.djs = [];
  djs.each(function(){
    show.djs.push($(this).text());
  });

  var description = $('#show_info_left p');
  show.description = description.text();
  
  var genres = $('#show_info_left').clone().find('h3, h4, a, p, b').remove().end();
  show.genres = [];
  _(genres.text().split(',')).each(function(g){
    show.genres.push($.trim(g));
  });
  
  //grab date and time
  
  var date_and_time = $('#show_info_right h4:first').text();
  var start_of_datetime = 20; //number of characters of 'Show description for'
  var date_time = date_and_time.substring(start_of_datetime).split('@');
  show.date = $.trim(date_time[0]);
  show.time = $.trim(date_time[1]);
  
  //grab the show comments and extract the image
  var comments = $('#show_info_right > p');
  show.comments = comments.clone().find('img').remove().end().html(); 
  show.image_url = $('img', comments).attr('src');

  var playlist = [];
  var table = ['track', 'artist', 'song', 'album', 'label', 'comments'];
  var tracks = $('table tr:has(td)'); //grab all rows from the table (except header)
  var airbreaks = 0;
  //replace this with a nice _ map function perhaps?
  tracks.each(function(row_num){
    row = $('td', this);
    var n = row_num - airbreaks;
    if(row.size() == 1 && n > 0){ //airbreaks only have one td (with a colspan='6')
      playlist[n-1]['airbreak_after'] = true;
      airbreaks++;
    } else { //track
      //this could be done with a nice _ map or reduce function I think
      playlist[n] = {};
      for(i in table){
        playlist[n][table[i]] = row.eq(i).text().trim();
      }
      playlist[n]['airbreak_after'] = false;
    }
  });
  show.playlist = playlist
  return show;
};

exports.timeline = function(window){
  var $ = window.jQuery;
  var history = [];
  var shows = $('table tr'); //grab all rows from the table
  //replace this with a nice _ map function perhaps?
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
};


