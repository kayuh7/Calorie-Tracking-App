const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

//blueprint Schema
const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, "need name"]
    },
    age: {type: Number,
        min: 16,
        required: true,
    },
    gender: String,
    weight: Number,
    height: Number,
    maxCal: {
        type: Number,
        required: [true, "daily goal"],
    },
    username: {
        type: String,
        required: [true, "need username"],
    },
    password: {
        type: String,
        required: [true, "need password"],
    },
    //validation
    email: {
        type: String,
        required: [true, "need email"]
    },
    // subdocument- to add dailyCals
    calories: [
        {
            // Based on user submitting
            date: {
                type: String,
                default: Date.now
            },
            //Type of meal
            meal: String,
            // amount of calories for this meal
            amount: {
                type: Number,
                default: 0,
            }
        }
    ],
    profile_img: String,
    cloudinary_id: String,
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('user', userSchema)