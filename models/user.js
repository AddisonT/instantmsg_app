var redis = require('redis');
var rtg   = require("url").parse(process.env.REDISTOGO_URL);
if(rtg.hostname){

  var client = redis.createClient(rtg.port, rtg.hostname, {no_ready_check: true});

  client.auth(rtg.auth.split(":")[1]);
}else{
  var client = redis.createClient(/* host, port*/);
}
var bcrypt = require('bcrypt');
	
function User(email,name){
	this.email = email;
	this.name = name;
};

User.prototype.encryptPassword = function(password, cb){
	var _user = this;
	bcrypt.genSalt(10, function(err, salt){
		bcrypt.hash(password, salt, function(err, hash){
			_user.password_digest = hash;
			cb(_user);
		});
	});
};

User.prototype.save = function(cb){
	var key = "user:"+this.email;
	var _user = this;

	client.sadd('users', key, function(err, created){

		if (!!created){
			client.hmset(key, {'name': _user.name, 'password_digest': _user.password_digest, 'email': _user.email}, 
				function(err, resp){
					cb(err, resp);
				});
		} else {
			//user account already exists
			cb(err, null);
		}
	});
};

User.authenticate = function(email, password, cb){
	var key = 'user:'+email;
	client.hgetall(key, function(err,data){
		//console.log("pwd_digest:::::::  "+data.password_digest);
		bcrypt.compare(password, data.password_digest, function(err,isPass){
			if (isPass) {
				cb(null, data);
			} else {
				console.log("THIS is from AUTH");
				console.log(isPass, data);
				cb(null, false);
			}
		});
	});
};

module.exports = User;