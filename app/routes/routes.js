
// frontend routes =========================================================
module.exports = function(app) {

  //public pages=============================================
  //root
  app.get('/', function(req, res) {
    console.log("root")
    res.render('root'); // load view/root.html file
  });
}
