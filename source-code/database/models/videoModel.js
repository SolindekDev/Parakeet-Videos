const mongoose = require('mongoose')
const Schema = mongoose.Schema

const videoSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    videoName: { type: String, required: true },
    authorToken: { type: String, required: true },
    views: { type: Number, required: true },
    mainSite: { type: Boolean, required: true },
    likes: { type: Array, default: [] },
}) 

const videoModel = mongoose.model('video', videoSchema);

module.exports = videoModel