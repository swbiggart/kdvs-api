

function make(Schema, mongoose) {
  var ObjectId = Schema.ObjectId;
  
  var News = new Schema({
    id            : ObjectId,
    title         : String,
    content       : String,
    cache_date    : {type: Date, default: Date}
  });
  mongoose.model('News', News);
  
  var DJs = new Schema({
    id            : ObjectId,
    name          : String,
    cache_date    : Date
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
    cache_date    : Date
  });

  var Track = new Schema({
    id            : ObjectId,
    number        : Number,
    artist        : String,
    song          : String,
    album         : String,
    label         : String,
    comments      : String,
    cache_date    : Date
  });

  var Playlist = new Schema({
    id            : ObjectId,
    date          : Date,
    description   : String,
    image_url     : String,
    image_cache   : String,
    tracks        : [Track],
    cache_date    : Date

  });

  var Schedule = new Schema({
    id            : ObjectId,
    start_date    : Date,
    end_date      : Date,
    title         : String,
    shows         : [Show],
    cache_date    : Date
  });
  
}

module.exports.make = make;
