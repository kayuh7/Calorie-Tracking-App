//checking to see if user is already authenticated by authentication function
module.exports = {
    isLoggedIn: function(req, res, next){
        if (req.isAuthenticated()){
            return next();
        }
        req.flash('error_msg', 'Please login')
        res.redirect('/login')
    },
    forwardAuthenticated: function(req, res, next){
        if (!req.isAuthenticated()){
            return next();
        }
        res.redirect('/calcount')
    }
}