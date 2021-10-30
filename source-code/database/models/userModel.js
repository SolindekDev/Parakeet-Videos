const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
    username: { type: String, required: true, unique: true},
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    token: { type: String, required: true, unique: true},
    informations: { type: String, default: "Not info yet" },
    location: { type: String, default: "Not specified" },
    followers: { type: Array },
    avatarURL: { type: String },
    endRegister: { type: Boolean, default: false }
}) 

const userModel = mongoose.model('users', userSchema);

module.exports = userModel