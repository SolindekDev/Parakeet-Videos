const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
    email: { type: String, required: true }, 
    subject: { type: String, required: true }, 
    description: { type: String, required: true }, 
    ip: { type: String, required: true }
}) 

const userModel = mongoose.model('feedback', userSchema);

module.exports = userModel