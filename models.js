

function make(Schema, mongoose) {
  var ObjectId = Schema.ObjectId;
  
  var News = new Schema({
    id            : ObjectId,
    title         : String,
    content       : String    
  });
  mongoose.model('News', News);
  
  var DJs = new Schema({
    id            : ObjectId,
    name          : String
  });

  var Show = new Schema({
    id            : ObjectId,
    show_id       : Number, 
    title         : String,
    description   : String,
    djs           : [DJs],
    start_hour    : Number,
    end_hour      : Number,
    start_min     : Number,
    end_min       : Number,
  });

  var Track = new Schema({
    id            : ObjectId,
    number        : Number,
    artist        : String,
    song          : String,
    album         : String,
    label         : String,
    comments      : String
  });

  var Playlist = new Schema({
    id            : ObjectId,
    date          : Date,
    description   : String,
    image_url     : String,
    image_cache   : String,
    tracks        : [Track]

  });

  var Schedule = new Schema({
    id            : ObjectId,
    start_date    : Date,
    end_date      : Date,
    title         : String,
    shows         : [Show]
  });
  
}

module.exports.make = make;
