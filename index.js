// Allows for environment to be set up
require('dotenv').config();

// Node.js Application Framework
const express = require('express');
const app = express();
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt') //encrypts passwords

// requiring package
const methodOverride = require('method-override')
// Method override function
app.use(methodOverride('_method'))

// session used for storing messages
const flash = require('connect-flash')

// Deconstructing values from .env file
const { URI, DB } = process.env

//Set the view engine
app.set('view engine', 'ejs')
app.use(express.static('public'))

//parsing body from client
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

//Multer And Cloudinary
const upload = require("./config/multer");
const cloudinary = require("./config/cloudinary");
const path = require("path");

//Connection
const mongoose = require('mongoose')
const url = `${URI}/${DB}`

let connectionObject = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    authSource: "admin",
    user: "acc",
    pass: "acc_rocks_2020"
}

mongoose
    .connect(url, connectionObject)
    .then(() => console.log(`Connected to the ${DB} database`))
    .catch(err => console.log(`Issue connecting to the ${DB} database`, err))

const UserModel = require('./models/user');
const { forwardAuthenticated, isLoggedIn } = require('./config/auth');

// MiddleWare
app.use(session({
    secret: "verygoodsecret", // encrypt user info before sending to db
    resave: true, //save the session obj even if not changed
    saveUninitialized: true //save the session obj even if not initialized
}))

// Import from passport file
require('./config/passport')(passport);
app.use(passport.initialize()); //first step to setting up passport
app.use(passport.session()); //keeps session running


// Flash - Store error messages
app.use(flash());
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error_msg = req.flash('error');
    next();
});

// Start Up Page
app.get('/', (req, res) => {
    res.redirect('/home')
})

app.get('/home', (req, res) => {
    res.render('home')
})

// Registration Page (read)
// Requires authentication to be forwarded
app.get('/register', forwardAuthenticated, (req, res) => {
    res.render('registration')
})

// POST - Creating and saving the user
app.post('/register', (req, res) => {
    let registryData = {}
    for (key in req.body) {
        registryData[key] = req.body[key]
    }
    //Checking required fields
    let errors = [];
    //Checking if passwords match
    if (registryData.password !== registryData.password2) {
        errors.push({ msg: "Passwords do not match" });
    }
    //Check pass length
    if (registryData.password.length < 6) {
        errors.push({ msg: 'Password should be at least 6 characters' });
    }
    //Validation passed
    //Before saving, checking to see if the user is already there
    if (errors.length > 0) {
        res.render('registration', { errors, registryData })
    }
    UserModel.findOne({ email: registryData.email })
        //return promise
        .then(user => {
            if (user) {
                //user exists
                errors.push({ msg: 'Email is already registered' })
                res.render('registration', {
                    errors, registryData
                });
            } else {
                const newUser = new UserModel(registryData)
                //Hash Password
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if (err) throw err;
                        //setting password to hash
                        newUser.password = hash;
                        //save user
                        newUser.save()
                            .then(user => {
                                req.flash('success_msg', 'You are now registered and can log in')
                                res.redirect('/login');
                            })
                            .catch(err => console.log(err))
                    })
                })
            }
        });
})

//Login Page
app.get('/login', forwardAuthenticated, (req, res) => {
    res.render('login')
})

app.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login',
        failureFlash: true
    }),
    function (req, res) {
        res.redirect('/calcount')
    });


// calcount page - user is logged in so no longer need req.body, use req.user instead
app.get('/calcount', isLoggedIn, (req, res) => {
    let totalCalories = 0
    // Filter an array of objects based on the date key 
    // Dates that match today's date
    let todaysLog = req.user.calories.filter(log => {
        return log.date == new Date().toDateString()
    })
    // Filter an array of objects based on the date key 
    todaysLog.forEach(log => {
        // this is the math to get total calorie balance at log in
        // Should only be balance for that date
        // need calendar on page to select date to filer all entries on specified date and ability to edit
        totalCalories += log.amount
    })
    let leftOver = (req.user.maxCal - totalCalories)
    // This is where we render userID, all object entries for the current day's date array (using an inner array)
    // Search field to query entry objects by calorie[]'s inner[date] OR aggregate
    // total calories used and the number difference between the two
    res.render('calcount', { data: req.user, total: totalCalories, left: leftOver, logs: todaysLog })
})

//need to store user's meal calories entered in a day with a total and a date
app.post("/calcount", (req, res) => {
    let log = {
        meal: req.body.meal,
        amount: req.body.calorieForMeal,
        date: new Date().toDateString()
    }
    // FIXED query - Log is working $push was the key, query by _id, only absolute unique identifier CB
    // FIXED now for each calorie entry there is a new object added to the calories array CB
    UserModel.findByIdAndUpdate({ _id: req.user._id }, { $push: { calories: log } }, function (error, result) {
        if (error) {
            console.log(error)
        } else {
            res.redirect("/calcount")
        }
    })
})

// DELETE
// Once we get date formating correct we can then run queries for history reports
// and user can look up calories by date in order to delete an entry.
app.delete('/calcount/:id', (req, res) => {
    const { id } = req.params
    UserModel.findByIdAndUpdate({ _id: req.user._id, calories: { $elemMatch: { _id: id } } }, { $pull: { calories: { _id: id } } }, function (error, result) {
        if (error) {
            console.log(error);
        } if (result) {
            res.redirect('/calcount')
        }
    })
})

app.get('/profile', isLoggedIn, (req, res) => {
    res.render("profile", { user: req.user })
})

app.get('/profileEditImage', isLoggedIn, (req, res) => {
    res.render("profileEditImage", {user: req.user })
})

app.put('/profileEditImage', upload.single("image"), async (req, res) => {
    try {
        const result = await cloudinary.uploader.upload(req.file.path);
        UserModel.findByIdAndUpdate({ _id: req.user._id }, {$set: {
            profile_img: result.secure_url,
            cloudinary_id: result.public_id,
        }},
        function(error, result) {
            if(error){
                console.log(error);
            } if (result) {
                res.redirect('/profile')
            }
        })
    } catch (error) {
        console.log(error)
    }
})

app.get('/profileEdit', isLoggedIn, (req, res) => {
    res.render("profileEdit", { user: req.user })
})

app.put('/profileEdit', (req, res) => {
            let updatedData = {}
            for (key in req.body) {
                updatedData[key] = req.body[key]
                if (req.body[key] == ''){
                    updatedData[key] = req.user[key]
                }
            }
        UserModel.findByIdAndUpdate({ _id: req.user._id }, {$set: {
            fullName: updatedData.fullName,
            age: updatedData.age,
            gender: updatedData.gender,
            weight: updatedData.weight,
            height: updatedData.height,
            maxCal: updatedData.maxCal,
        }},
        function(error, result) {
            if(error){
                console.log(error);
            } if (result) {
                res.redirect('/profile')
            }
        })
    })

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return (next(err))
        }
    });
    req.flash('success_msg', ' You are logged out!');
    res.redirect('/home');
})

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Healthwise app on port ${port}`))