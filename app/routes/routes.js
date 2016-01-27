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
              //then send emails
              send_permission_emails(user_name, team_name, email_A, email_B, reason, intro, function(err){
                if(err){
                  console.log(err)
                  res.send(500)
                }
                else{
                  console.log(team_name + ": sent an intro on " + intro.createdAt)
                  res.send("I have sent a request to " + email_A + " and " + email_B + ", asking permission to introduce them, with text: " + reason)
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
    person_A = {
      email: email_A,
      status: "Pending",
      email_token: randomInt(10000)
    }

    person_B = {
      email: email_B,
      status: "Pending",
      email_token: randomInt(10000)
    }

    Intro.create({user_name: user_name,
                  user_id: user_id,
                  team_name: team_name,
                  team_id: team_id,
                  person_A: person_A,
                  person_B: person_B,
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

  var send_permission_emails = function(user_name, team_name, email_A, email_B, reason, intro, cb){

    var email_text = "<!DOCTYPE html><html><head><meta content='text/html;charset=UTF-8' http-equiv='Content-Type'/>"
    email_text = "<style type='text/css'></style></head>"
    email_text += "<body style='border: 0; margin: 0; padding: 0; min-width: 100%; background-color: #ffffff;' override='fix'>"
    email_text += "<table border='0' cellpadding='0' cellspacing='0' width='100%''>"
    email_text += "<tr><td align='center' class='icon' height='72' style='border: 0; margin: 0; padding: 0;'>"
    email_text += "<a href=https://pleasemeet.herokuapp.com/ style='border: 0; margin: 0; padding: 0;' target='_blank'>"
    email_text += "<img src='https://pleasemeet.herokuapp.com/images/pleasemeet_logo.png' width='150' style='border: 0; margin: 0; padding: 0;' /></a></td></tr>"
    //spacer
    email_text += "<tr><td height='22' style='border: 0; margin: 0; padding: 0; font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;' width='100%'><div class='clear' style='height: 22px; width: 1px;'>&nbsp;</div></td></tr>"
    email_text += "<tr><td>Dear Madam/Sir,</tr></td>"

    email_text += "<tr><td height='22' style='border: 0; margin: 0; padding: 0; font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;' width='100%'><div class='clear' style='height: 22px; width: 1px;'>&nbsp;</div></td></tr>"
    email_text += "<tr><td>" + user_name + " from " + team_name + " thought you might be interested in being introduced to someone new.</td></tr>"

    email_text += "<tr><td height='22' style='border: 0; margin: 0; padding: 0; font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;' width='100%'><div class='clear' style='height: 22px; width: 1px;'>&nbsp;</div></td></tr>"
    email_text += "<tr><td style='text-align: center; padding: 10px;' height='22'><span style='background-color: #eeeeee;'>" + reason + "</span></td></tr>"

    email_text += "<tr><td height='22' style='border: 0; margin: 0; padding: 0; font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;' width='100%'><div class='clear' style='height: 22px; width: 1px;'>&nbsp;</div></td></tr>"
    email_text += "<tr><td>Are you interested in this introduction?</td></tr>"
    email_text += "<tr><td height='22' style='border: 0; margin: 0; padding: 0; font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;' width='100%'><div class='clear' style='height: 22px; width: 1px;'>&nbsp;</div></td></tr>"

    //this part is the only variant between the two emails--------
    var email_text2_A = "<tr><td><span style='width:50px;height:45px;padding:5px;border-radius:6px;background:#ffffff;border-color:#cccccc #cccccc #cccccc;border-style:solid;border-width:1px 1px 3px' bgcolor='#ffffff' width='42' height='40'>"
    email_text2_A += "<a href='http://pleasemeet.herokuapp.com/yes/" + intro._id + "/" + intro.person_A.email_token + "' target='_blank'>"
    email_text2_A += "<span style='line-height:40px;text-decoration:none;font-size:18px;color:#e52c9f'>ACCEPT</span></a></span>&nbsp;&nbsp;"

    email_text2_A += "<span style='width:50px;height:45px;padding:5px;border-radius:6px;background:#ffffff;border-color:#cccccc #cccccc #cccccc;border-style:solid;border-width:1px 1px 3px' bgcolor='#ffffff' width='42' height='40'>"
    email_text2_A += "<a href='http://pleasemeet.herokuapp.com/no/" + intro._id + "/" + intro.person_A.email_token + "' target='_blank'>"
    email_text2_A += "<span style='line-height:40px;text-decoration:none;font-size:18px;color:#e52c9f'>DECLINE</span></a></span></td></tr>"

    var email_text2_B = "<tr><td><span style='width:50px;height:45px;padding:5px;border-radius:6px;background:#ffffff;border-color:#cccccc #cccccc #cccccc;border-style:solid;border-width:1px 1px 3px' bgcolor='#ffffff' width='42' height='40'>"
    email_text2_B += "<a href='http://pleasemeet.herokuapp.com/yes/" + intro._id + "/" + intro.person_B.email_token + "' target='_blank'>"
    email_text2_B += "<span style='line-height:40px;text-decoration:none;font-size:18px;color:#e52c9f'>ACCEPT</span></a></span>&nbsp;&nbsp;"

    email_text2_B += "<span style='width:50px;height:45px;padding:5px;border-radius:6px;background:#ffffff;border-color:#cccccc #cccccc #cccccc;border-style:solid;border-width:1px 1px 3px' bgcolor='#ffffff' width='42' height='40'>"
    email_text2_B += "<a href='http://pleasemeet.herokuapp.com/no/" + intro._id + "/" + intro.person_B.email_token + "' target='_blank'>"
    email_text2_B += "<span style='line-height:40px;text-decoration:none;font-size:18px;color:#e52c9f'>DECLINE</span></a></span></td></tr>"
    //-------------------

    var email_text3 = "<tr><td height='22' style='border: 0; margin: 0; padding: 0; font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;' width='100%'><div class='clear' style='height: 22px; width: 1px;'>&nbsp;</div></td></tr>"
    email_text3 += "<tr><td><small>Discover <a href='http://pleasemeet.herokuapp.com'>Please Meet</a>, a service by <a href='http://www.smooz.io'>Smooz</a></small></td></tr>"
    email_text3 += "</body></html>"

    //email to A
    EmailServer.send({
      text:    email_text + email_text2_A + email_text3,
      from:    user_name + " from " + team_name + " <contact@smooz.io>",
      to:      email_A,
      bcc:      "Matthieu <matthieu@smooz.io>",
      subject: user_name + " would like to introduce someone to you",
      "content-type": 'text/html;charset=UTF-8'
    }, function(err, message) {
      if(err){
        cb(err)
      }
      else{
        //console.log(message)

        //email to B
        EmailServer.send({
            text:    email_text + email_text2_B + email_text3,
            from:    user_name + " from " + team_name + " <contact@smooz.io>",
            to:      email_B,
            bcc:      "Matthieu <matthieu@smooz.io>",
            subject: user_name + " would like to introduce someone to you",
            "content-type": 'text/html;charset=UTF-8'
          }, function(err, message) {
            if(err){
              cb(err)
            }
            else{
              //console.log(message)
              cb()
            }
        })
      }
    });
  }


  //answer YES from email or DM
  app.get('/yes/:intro_id/:email_token', function(req, res) {
    intro_reply(req.params.intro_id, req.params.email_token, true, res)
  });

  //answer NO from email or DM
  app.get('/no/:intro_id/:email_token', function(req, res) {
    intro_reply(req.params.intro_id, req.params.email_token, true, res)
  });

  var intro_reply = function(id, token, accepted, res){
    var id = mongoose.Types.ObjectId(id)

    Intro.findOne({_id: id}, function(err, intro){
      if(err){
        console.log(err)
        res.sendCode(500)
      }
      else if(!intro){
        console.log("Received yes but could not find intro: " + id)
        res.sendCode(404)
      }
      else{
        if(token == intro.person_A.email_token){
          console.log("A said " + accepted + " to intro: " + id)

          save_intro_status(intro, "A", accepted)
          res.send("Thank you")
        }
        else if(token == intro.person_B.email_token){
          console.log("B said " + accepted + " to intro: " + id)

          save_intro_status(intro, "B", accepted)
          res.send("Thank you")
        }
        else {
          console.log("Received " + accepted + " for intro " + id + " but could not find token matching " + token)
          res.sendCode(404)
        }
      }
    })
  }

  var save_intro_status = function(intro, person_code, accepted){
    if(person_code == "A"){
      if(accepted){
        intro.person_A.status = "Accepted"
        if(intro.person_B.status == "Accepted"){
          intro.status = "Accepted"
          send_intro_email(intro)
        }
      }
      else{
        intro.person_A.status = "Declined"
        intro.status = "Declined"
      }
    }
    else if(person_code == "B"){
      if(accepted){
        intro.person_B.status = "Accepted"
        if(intro.person_A.status == "Accepted"){
          intro.status = "Accepted"
          send_intro_email(intro)
        }
      }
      else{
        intro.person_B.status = "Declined"
        intro.status = "Declined"
      }
    }
    else{
      console.log("Error with saving intro, person: " + person)
    }

    intro.save(function(err){
      console.log("Intro updated with reply")
    })
  }

  var send_intro_email = function(intro){
    var email_text = "<!DOCTYPE html><html><head><meta content='text/html;charset=UTF-8' http-equiv='Content-Type'/>"
    email_text = "<style type='text/css'></style></head>"
    email_text += "<body style='border: 0; margin: 0; padding: 0; min-width: 100%; background-color: #ffffff;' override='fix'>"
    email_text += "<table border='0' cellpadding='0' cellspacing='0' width='100%''>"
    email_text += "<tr><td align='center' class='icon' height='72' style='border: 0; margin: 0; padding: 0;'>"
    email_text += "<a href=https://pleasemeet.herokuapp.com/ style='border: 0; margin: 0; padding: 0;' target='_blank'>"
    email_text += "<img src='https://pleasemeet.herokuapp.com/images/pleasemeet_logo.png' width='150' style='border: 0; margin: 0; padding: 0;' /></a></td></tr>"
    //spacer
    email_text += "<tr><td height='22' style='border: 0; margin: 0; padding: 0; font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;' width='100%'><div class='clear' style='height: 22px; width: 1px;'>&nbsp;</div></td></tr>"
    email_text += "<tr><td>Dear Madam/Sir,</tr></td>"

    email_text += "<tr><td height='22' style='border: 0; margin: 0; padding: 0; font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;' width='100%'><div class='clear' style='height: 22px; width: 1px;'>&nbsp;</div></td></tr>"
    email_text += "<tr><td>" + intro.user_name + " from " + intro.team_name + " thought you should be introduced to each other.</td></tr>"

    email_text += "<tr><td height='22' style='border: 0; margin: 0; padding: 0; font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;' width='100%'><div class='clear' style='height: 22px; width: 1px;'>&nbsp;</div></td></tr>"
    email_text += "<tr><td style='text-align: center; padding: 10px;' height='22'><span style='background-color: #eeeeee;'>" + intro.reason + "</span></td></tr>"

    email_text += "<tr><td height='22' style='border: 0; margin: 0; padding: 0; font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;' width='100%'><div class='clear' style='height: 22px; width: 1px;'>&nbsp;</div></td></tr>"
    email_text += "<tr><td>Please meet :-)</td></tr>"

    email_text += "<tr><td height='22' style='border: 0; margin: 0; padding: 0; font-size: 1px; line-height: 1px; mso-line-height-rule: exactly;' width='100%'><div class='clear' style='height: 22px; width: 1px;'>&nbsp;</div></td></tr>"
    email_text += "<tr><td><small>Discover <a href='http://pleasemeet.herokuapp.com'>Please Meet</a>, a service by <a href='http://www.smooz.io'>Smooz</a></small></td></tr>"
    email_text += "</body></html>"

    var email_A = intro.person_A.email + " <" + intro.person_A.email + ">"
    var email_B = intro.person_B.email + " <" + intro.person_B.email + ">"

    //joint email
    EmailServer.send({
        text:    email_text,
        from:    intro.user_name + " from " + intro.team_name + " <contact@smooz.io>",
        to:      email_A + ", " + email_B,
        bcc:      "Matthieu <matthieu@smooz.io>",
        subject: "There is someone I'd like you to meet",
        "content-type": 'text/html;charset=UTF-8'
      }, function(err, message) {
        if(err){
          console.log(err)
        }
        else{
          //console.log(message)
          console.log("Intro sent")
        }
    })
  }

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

  //utilities
  function randomInt (max) {
    return Math.floor(Math.random() * max);
  }
}
