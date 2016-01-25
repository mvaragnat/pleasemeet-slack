// grab the mongoose module
var mongoose = require('mongoose');

//and the plugin
var findOrCreate = require('mongoose-findorcreate')

// define our user model
var teamSchema = new mongoose.Schema({
    access_token: {type: String, default: ''},
    team_name: {type: String, default: ''},
    team_id: {type: String, default: ''}
  }
);

teamSchema.plugin(findOrCreate);

var Team = mongoose.model("Team", teamSchema);

// module.exports allows us to pass this to other files when it is called
module.exports = Team;
