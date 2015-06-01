var express = require('express');
var router = express.Router();
var User = require('../models/user');
var session = require('express-session');
var redis = require('redis');
var client = redis.createClient(/* host, port*/);


router.use(session({
  secret: 'supersuper secret',
  resave: false,
  saveUninitialized: true
}));

router.use(function(req, res, next){
  req.login = function(user){
  		console.log("THIS IS USER FROM LOGIN " + user);
    req.session.userId = user;
  };

  req.currentUser = function(cb){
    //get user's data from redis
    var key = 'user:'+req.session.userId;
    console.log("THIS IS THE KEY "+ key);
   client.hgetall(key, function(err, data){
    	console.log("THIS IS THE USER   "+ data);
      req.user = data;
      cb(null,data);
    });
  };

  req.logout = function(){
    req.session.userId = null;
    req.user = null;
  };

  next();
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/signup', function(req, res, next){
	res.render('signup', {title: 'Testing signup page'});
});

router.post('/signup', function(req,res,next){
	var member = new User(req.body.email, req.body.name);
	member.encryptPassword(req.body.password, function(user){
		
		user.save(function(err, resp){
			res.redirect('login');
		});
	});
});

router.get('/login', function(req, res, next){
	//res.send("I got here");
	res.render('login', {title: "login"});
});

router.post('/login', function(req, res, next){
	console.log(req.body);
	User.authenticate(req.body.email, req.body.password, function(err, data){
		console.log("ERR: " + err);
		console.log("DATA: "+ data);
		req.login(data.email);
		res.redirect('/users');
	});
});

router.get('/auth', function(req,res,next){
	req.currentUser(function(err, u){
		console.log("I'm here in the test route. User is "+ u);
		res.render('test');
	});

	// res.render('test');
});

router.get('/users', function(req, res, next){
	res.render('user');
});

router.get('/friends/:id', function(req, res, next){
	res.json();
});

router.post('/friends/:id', function(req, res, next){
	res.json();
});

module.exports = router;
