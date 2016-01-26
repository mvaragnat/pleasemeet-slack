var Request   = require('request');
var mongoose  = require('mongoose');
var Email     = require("emailjs/email");
var Team      = require('../models/team')
var Intro      = require('../models/intro')

var EmailServer  = Email.server.connect({
   user:     process.env.EMAIL_USERNAME,
   password: process.env.EMAIL_PASSWORD,
   host:     process.env.EMAIL_HOST,
   ssl:      true
});

// frontend routes =========================================================
module.exports = function(app) {
  var url = process.env.SLACK_REDIRECT

  //public pages=============================================
  //root
  app.get('/', function(req, res) {
    console.log("root")

    res.render('root'); // load view/root.html file
  });

  // post from Slack command
  app.post('/intro', function(req, res) {
    console.log("Command received")
    //console.log(req.body)

    //check request token
    if(req.body.token == process.env.SLACK_COMMAND_TOKEN){
      var team_name = req.body.team_domain
      var team_id = req.body.team_id
      var user_name = req.body.user_name
      var user_id = req.body.user_id

      var text = req.body.text
      console.log(text)
      var blocks = text.split(" ")

      //handle alternative request types
      if(text == "list" || text == "status"){
        console.log(team_name + ": requests list of intros")
        res.send("List of intros")
      }
      else if(text == "help"){
        console.log(team_name + ": requests help")
        res.send("Help")
      }
      //
      else if(blocks.length > 2){
        var reason = text.slice(blocks[0].length + blocks[1].length + 1)
        var email_A = blocks[0]
        var email_B = blocks[1]

        //check that the inputs are correclty formatted
        var email_format = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

        if( email_A.match(email_format) && email_B.match(email_format) ){

          //first save the intro with "pending" status
          create_intro(user_name, user_id, team_name, team_id, email_A, email_B, reason, function(err, intro){
            if(err){
              console.log(err)
              res.send(500)
            }
            else{
              //then send email
              send_permission_email(user_name, team_name, email_A, email_B, reason, intro, function(err){
                if(err){
                  console.log(err)
                  res.send(500)
                }
                else{
                  console.log(team_name + ": sent an intro on " + intro.createdAt)
                  res.send("I have sent a request to " + email_B + ", asking permission to be introduced to " + email_A + ", with text: " + reason)
                }
              })
            }
          })
        }
        else{
          res.send("Please use only emails")
        }
      }
      //default to help
      else{
        //any other case: send help
        res.send("Help")
      }
    }
    else{
      console.log("Incorrect Slack Command token: " + req.body.token)
      res.sendStatus(500)
    }

  //   { token: 'lF0cLK0GTSr5kTjfNXyLhfvy',
  // team_id: 'T0FEV82UE',
  // team_domain: 'articial-client',
  // channel_id: 'C0FEPJ7FW',
  // channel_name: 'general',
  // user_id: 'U0FESCLRH',
  // user_name: 'aurelie',
  // command: '/intro',
  // text: 'test',
  // response_url: 'https://hooks.slack.com/commands/T0FEV82UE/19407880118/Po47PwtwjSKR4hSlXSORn5fR' }
  });

  var create_intro = function(user_name, user_id, team_name, team_id, email_A, email_B, reason, cb){
    //function(err, intro)
    //always find people by user_id + team_id pair
    Intro.create({user_name: user_name,
                  user_id: user_id,
                  team_name: team_name,
                  team_id: team_id,
                  email_A: email_A,
                  email_B: email_B,
                  reason: reason}, function(err, intro) {
      if(err){
        cb(err, null)
      }
      else{
        console.log(intro)
        cb(null, intro)
      }
    })
  }

  var send_permission_email = function(user_name, team_name, email_A, email_B, reason, intro, cb){
    var email_text = "<!DOCTYPE html><html><head><meta content='text/html;charset=UTF-8' http-equiv='Content-Type'/></head>"
    email_text += "<body><div>Dear Madam/Sir,</div>"
    email_text += "<div>" + user_name + " from " + team_name + " thought you might be interested in being introduced to someone new (" + email_A + ").</div>"
    email_text += "<div>" + user_name + " sent this message:</div>"
    email_text += "<div>" + reason + "</div>"
    email_text += "<div>Are you interested in this introduction?</div>"
    email_text += "<div><a href='http://bepolite.herokuapp.com/yes/" + intro._id + "'>ACCEPT</a> or <a href='http://bepolite.herokuapp.com/no/" + intro._id + "'>DECLINE</a>\n\n"
    email_text += "</div>"
    email_text += "<div><small>Discover <a href='http://bepolite.herokuapp.com'>BePolite</a>, a service by <a href='http://www.smooz.io'>Smooz</a></small></div>"
    email_text += "</body></html>"

    EmailServer.send({
      text:    email_text,
      from:    user_name + " from " + team_name + " <contact@smooz.io>",
      to:      email_B,
      bcc:      "Matthieu <matthieu@smooz.io>",
      subject: user_name + " from " + team_name + " would like to introduce someone to you",
      "content-type": 'text/html;charset=UTF-8'
    }, function(err, message) {
      if(err){
        cb(err)
      }
      else{
        console.log(message)
        cb()
      }
    });
  }


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
