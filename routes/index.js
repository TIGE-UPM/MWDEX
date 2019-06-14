var express = require('express');
var router = express.Router();

router.index = function(req, res){
	var msgAlert="";
	res.render('index', { title: 'Workshop Grades',msgAlert:msgAlert});
};
/* GET home page. */
router.about = function(req, res){
  res.render('about', { title: 'Workshop Grades' });
};
router.courses = function(req, res){
  res.render('courses', { title: 'Workshop Grades' });
};
module.exports = router;
