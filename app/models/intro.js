// grab the mongoose module
var mongoose = require('mongoose');

//and the plugin
var findOrCreate = require('mongoose-findorcreate')

// define our user model
var introSchema = new mongoose.Schema({
    team_name: {type: String, default: ''},
    team_id: {type: String, default: ''},
    user_name: {type: String, default: ''}, //sender of the intro
    user_id: {type: String, default: ''},   //sender of the intro
    person_A: {
      email: {type: String, default: ''},
      status: {type: String, default: 'Pending'},
      email_token: {type: String, default: ''} //random int between 1 and 10 000. Just to avoid simple copy-pasting of links
    },
    person_B: {
      email: {type: String, default: ''},
      status: {type: String, default: 'Pending'},
      email_token: {type: String, default: ''}
    },
    reason: {type: String, default: ''},
    status: {type: String, default: 'Pending'}
  },
  { timestamps: true }
);

introSchema.plugin(findOrCreate);

var Intro = mongoose.model("Intro", introSchema);

// module.exports allows us to pass this to other files when it is called
module.exports = Intro;
