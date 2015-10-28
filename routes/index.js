var express = require('express');
var router = express.Router();
var User = require('../models/user');
var session = require('express-session');
var bodyParser = require('body-parser');

var redis = require('redis');
var url = require('url');
//var client = redis.createClient(/* host, port*/);

//code for allowing redis to work with Heroku
if(process.env.REDISTOGO_URL){
	var rtg = url.parse(process.env.REDISTOGO_URL);
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

//for using JWTS
router.use('/api', expressJwt({secret: 'super secret secret'}));
router.use(bodyParser.json());

//creating user sessions
router.use(function(req, res, next){
  req.login = function(user){
  		console.log("THIS IS USER FROM LOGIN " + user);
    req.session.userId = user;
  };

  req.currentUser = function(cb){
    //get user's data from redis
    var key = 'user:'+req.session.userId;
    //console.log("THIS IS THE KEY "+ key);
    client.hgetall(key, function(err, data){
    	//console.log("THIS IS THE USER   "+ data);
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

router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/signup', function(req, res, next){
	res.render('signup', {title: 'Testing signup page'});
});

//rouute for signing up a user on the backend
router.post('/signup', function(req,res,next){
	//console.log("THIS IS REQ BODY IN SIGN UP"+req.body.person);
	var member = new User(req.body.person.email, req.body.person.name);
	member.encryptPassword(req.body.person.password, function(user){
		
		user.save(function(err, resp){
			res.json({"msg": "You signed up"});
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

//client makes an ajax request to this route to authenticate a user on login
//if the user is succesfully logged it, the route will send a JWT to the client 
router.post('/login', function(req, res, next){
	console.log("Login ajax request on server side ", req.body);
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

//route for client side ajax request for getting the current user's list of friends from redis.
router.get('/api/friends/:id', function(req, res, next){
	req.currentUser(function(err, user){
		client.smembers('friends:'+req.params.id, function(err, data){
			res.json({friends: data});
		});
	});
});

//route for client side ajax request for adding a user to his/her friend list.
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
