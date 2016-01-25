var Request   = require('request');
var mongoose  = require('mongoose');
var Email     = require("emailjs/email");
var Team      = require('../models/team')

var EmailServer  = Email.server.connect({
   user:     process.env.EMAIL_USERNAME,
   password: process.env.EMAIL_PASSWORD,
   host:     process.env.EMAIL_HOST,
   ssl:      true
});

// frontend routes =========================================================
module.exports = function(app) {
  if(process.env.NODE_ENV == "production"){
    var url = process.env.SLACK_REDIRECT
  }
  else{
    var url = "http://localhost:5000/"
  }

  //public pages=============================================
  //root
  app.get('/', function(req, res) {
    console.log("root")
    var redirect = url + "new"

    res.render('root', {redirect_uri: redirect}); // load view/root.html file
  });

  // post from Slack command
  app.post('/intro', function(req, res) {
    console.log("root")
    res.render('root');
  });

  //answer YES from email or DM
  app.get('/yes', function(req, res) {
    console.log("root")
    res.render('root'); // load view/root.html file
  });

  //answer NO from email or DM
  app.get('/no', function(req, res) {
    console.log("root")
    res.render('root'); // load view/root.html file
  });

  //new user creation - redirection from Slack
  app.get('/new', function(req, res) {
    console.log("================== START TEAM REGISTRATION ==================")
    //temporary authorization code
    var auth_code = req.query.code

    if(!auth_code){
      //user refused auth
      res.redirect('/')
    }
    else{
      console.log("New use auth code " + auth_code)
      perform_auth(auth_code, res)
    }
  })

  //FONCTIONS DE CREATION ===================================================

  var perform_auth = function(auth_code, res){
    //post code, app ID, and app secret, to get token
    var auth_adresse = 'https://slack.com/api/oauth.access?'
    auth_adresse += 'client_id=' + process.env.SLACK_ID
    auth_adresse += '&client_secret=' + process.env.SLACK_SECRET
    auth_adresse += '&code=' + auth_code
    auth_adresse += '&redirect_uri=' + url + "new"

    Request.get(auth_adresse, function (error, response, body) {
      if (error){
        console.log(error)
        res.sendStatus(500)
      }

      else{
        var _body = JSON.parse(body)
        console.log("New user auth")
        console.log(_body)

        register_team(_body.access_token, _body.team_name, _body.team_id, res)
      }
    })
  }

  var register_team = function(token, name, id, res){

    Team.findOrCreate({team_id: id}, //search option. User is identified by team id
                      {
                        access_token: token, //added on creation
                        team_name: name
                      }, function(err, team, created) {
      if(created){
        console.log(name + ": new team registered")
        console.log(team)
        //add a thank you / confirmation note
        res.redirect('/')
      }
      else{
        console.log(name + ": team already exists")

        //update parameters
        team.team_name = name
        team.access_token = token

        team.save(function(err){
          if (err){
            console.log(err)
            res.sendStatus(500)
          }
          else{
            console.log(name + ": info updated")
            //add a thank you / confirmation note
            res.redirect('/')
          }
        })
      }
    })
  }
}
