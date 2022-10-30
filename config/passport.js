// const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

//bringing in user model
const UserModel = require('../models/user')

module.exports = function(passport){
    passport.use(
        //local strategy allows us to authenticate users by looking up data in the app's database
        new LocalStrategy({usernameField: 'username'}, (username, password, done) => {
            //match user through username
            UserModel.findOne({username: username})
            .then(user => {
                if(!user) {
                    return done(null, false, {message: 'That email is not registered'});
                }
                //match password
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if(err) throw err;
                    if(isMatch) {
                        return done(null, user)
                    } else {
                        return done(null, false, {message: 'Password incorrect'})
                    }
                });
            })
            .catch(err => console.log(err))
        })
    );
    // Only during the authentication to specify what user information should be stored in the session.
    passport.serializeUser(function(user, done){
        done(null, user.id);
    });
    //enables us to load additional user information on every request. This user object is attached to the request as req.user making it accessible in our request handling.
    passport.deserializeUser(function(id, done) {
        UserModel.findById(id, (err, username) => {
            done(err, username);
        })
    })
}