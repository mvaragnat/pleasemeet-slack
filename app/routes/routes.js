var SlackConfig = require('../../config/slack')
var EmailConfig = require('../../config/email')

var Request = require('request');
var mongoose = require('mongoose');
var Email   = require("emailjs/email");

var EmailServer  = Email.server.connect({
   user:     EmailConfig.username,
   password: EmailConfig.password,
   host:     EmailConfig.emailHost,
   ssl:      true
});

// frontend routes =========================================================
module.exports = function(app) {

  //public pages=============================================
  //root
  app.get('/', function(req, res) {
    console.log("root")
    res.render('root'); // load view/root.html file
  });

  app.get('/intro', function(req, res) {
    console.log("root")
    res.render('root'); // load view/root.html file
  });

  app.get('/yes', function(req, res) {
    console.log("root")
    res.render('root'); // load view/root.html file
  });

  app.get('/no', function(req, res) {
    console.log("root")
    res.render('root'); // load view/root.html file
  });

  //new user creation - redirection from Slack
  app.get('/new', function(req, res) {
    console.log("================== START USER CREATION ==================")
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
    auth_adresse += 'client_id=' + SlackConfig.appClientID
    auth_adresse += '&client_secret=' + SlackConfig.appClientSecret
    auth_adresse += '&code=' + auth_code
    auth_adresse += '&redirect_uri=' + url + "new"

    if(contact_id){
      auth_adresse += "/" + contact_id
    }

    Request.get(auth_adresse, function (error, response, body) {
      if (error){
        console.log(error)
        res.sendStatus(500)
      }

      else{
        var _body = JSON.parse(body)
        console.log("New user auth")

        //if auth accepted
        //now we have token and team info
        if(_body.access_token){
          res.redirect('/')
        }
      }
    })
  }

}
