var express = require('express');
var router = express.Router();
var User = require('../models/user');
var session = require('express-session');
var bodyParser = require('body-parser');

var redis = require('redis');
var rtg   = require("url").parse(process.env.REDISTOGO_URL);
if(rtg.hostname){

  var client = redis.createClient(rtg.port, rtg.hostname, {no_ready_check: true});

  client.auth(rtg.auth.split(":")[1]);
}else{
  var client = redis.createClient(/* host, port*/);
}


var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');

router.use(session({
  secret: 'supersuper secret',
  resave: false,
  saveUninitialized: true
}));

router.use('/api', expressJwt({secret: 'super secret secret'}));

//need the json express middle
// router.use(express.json());
// router.use(express.urlencoded());
router.use(bodyParser.json());

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
	console.log("THIS IS REQ BODY IN SIGN UP"+req.body.person);
	var member = new User(req.body.person.email, req.body.person.name);
	member.encryptPassword(req.body.person.password, function(user){
		
		user.save(function(err, resp){
			res.json({"msg": "You signed up"});
			//res.redirect('login');
		});
	});
});

router.use('/login', function(req, res, next){
	if(req.session.userId){
		res.redirect('/users');
	}else{
		next();
	}
});

router.get('/login', function(req, res, next){
	//res.send("I got here");
	res.render('login', {title: "login"});
});

router.post('/login', function(req, res, next){
	console.log(req.body);
	User.authenticate(req.body.person.email, req.body.person.password, function(err, data){
		console.log("ERR: " + err);
		if(data){
			req.login(data.email);

			//create jwt token and send the token as a json object let angular take care of the routes
			var profile = {
				name: data.name,
				id: data.email
			};
			
			var token = jwt.sign(profile, 'super secret secret');

			res.json({token: token});
			//res.redirect('/users');
		}else{
			res.redirect('/login');
		}
	});
});

router.get('/api/users', function(req, res, next){
	req.currentUser(function(err, user){
		res.render('user', {user: user});
	});
});

router.get('/api/friends/:id', function(req, res, next){
	req.currentUser(function(err, user){
		client.smembers('friends:'+req.params.id, function(err, data){
			res.json({friends: data});
		});
	});
});

router.post('/api/friends/:id', function(req, res, next){
	req.currentUser(function(err, user){
		var key = "user:"+req.body.friend;
		client.sismember('users', key, function(err, created){

			if(!!created){
				client.sadd('friends:'+req.params.id, req.body.friend, function(err, data){
					res.json({results: "friend added"});
				});
			} else {
				res.json({results: "user doesn't exist"});
			}
		});
	});
});

module.exports = router;
