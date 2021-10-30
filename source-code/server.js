const express = require('express');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser')
const app = express();
const port = 3000
const Str = require('@supercharge/strings')
const validator = require("email-validator");
const passwordValidator = require('password-validator');
const passwordSchema = new passwordValidator();
const crypto = require("crypto");
const cookieParser = require('cookie-parser')
const fetch = require('node-fetch')

require('./database/database')

const userModel = require('./database/models/userModel')
const videoModel = require('./database/models/videoModel');
const reportModel = require('./database/models/reportModel');
const feedbackModel = require('./database/models/feedbackModel');
const { compile } = require('ejs');

app.use(cookieParser())
app.use(fileUpload());
app.set('view engine', 'ejs')
app.use(express.static('upload'))
app.use('/upload', express.static(__dirname + '\\upload'))

const jsonParser = bodyParser.json()
const urlencodedParser = bodyParser.urlencoded({ extended: false })

app.get('/search', (req, res) => {
    if (req.cookies.token == undefined || req.cookies.token == "") {
        if (!req.query.s) return res.redirect('/')
        const data = {
            value: req.query.s,
            results: null
        }
        const searchRegex = new RegExp(data.value, 'g')
        videoModel.find({ title: { $regex: searchRegex } }, (err, videos) => {
            userModel.find({ username: data.value }, (err, users) => {
                userModel.find({ }, (err, usersAll) => {
                    res.render('search', { search: data, video: videos, usersRes: users, user: null, usersAll: usersAll });
                })
            })
        })
    } else {
        userModel.findOne({ token: req.cookies.token }, (err, user) => {
            if (user == null) return res.redirect('/login')

            if (!req.query.s) return res.redirect('/')
            const data = {
                value: req.query.s,
                results: null
            }
            const searchRegex = new RegExp(data.value, 'g')
            videoModel.find({ title: { $regex: searchRegex } }, (err, videos) => {
                userModel.find({ username: data.value }, (err, users) => {
                    userModel.find({ }, (err, usersAll) => {
                        res.render('search', { search: data, video: videos, usersRes: users, user: user, usersAll: usersAll });
                    })
                })
            })
        })
    }
})

app.get('/', (req, res) => {
    if (req.cookies.token == undefined || req.cookies.token == "") {
        // videoModel.find({}, (err, video) => {
        //     userModel.find({}, (err, user) => {
        //         res.render('indexNotLogged', { video: video, usersAll: user })
        //     })
        // })
        videoModel.find({}, (err, video) => {
            userModel.find({}, (err, usersAll) => {
                const data = {
                    videos: []
                }
                var i = 0;
                video.forEach(videoe => {
                    i++
                    if (i < 20) {
                        if (videoe.mainSite == true) {
                            const userRs = usersAll.find(userFind => userFind.token == videoe.authorToken)
                            const createData = {
                                user: userRs,
                                video: videoe
                            }
                            data.videos.push(createData)
                        }
                    } else {
                    }
                })
                res.render('indexNotLogged', { video: data })
            })
        })
    } else {
        userModel.findOne({ token: req.cookies.token }, (err, user) => {
            if (user == null) return res.redirect('/login')

            videoModel.find({}, (err, video) => {
                userModel.find({}, (err, usersAll) => {
                    const data = {
                        videos: []
                    }
                    var i = 0;
                    video.forEach(videoe => {
                        i++
                        if (i < 20) {
                            if (videoe.mainSite == true) {
                                const userRs = usersAll.find(userFind => userFind.token == videoe.authorToken)
                                const createData = {
                                    user: userRs,
                                    video: videoe
                                }
                                data.videos.push(createData)
                            }
                        } else {
                        }
                    })
                    res.render('indexLogged', { video: data, user: user })
                })
            })
        })
    }
})

app.get('/register', (req, res) => {
    res.render('register', { message: null })
})

app.get('/login', (req, res) => {
    res.render('login', { message: null })
})

app.post('/login', urlencodedParser, (req, res) => {
    const { email, password } = req.body

    if (!email) return res.render('login', { message: 'Please enter your email' })
    if (!password) return res.render('login', { message: 'Please enter your password' })

    userModel.findOne({ email: email, password: password }, (err, user) => {
        if (user == null) return res.render('login', { message: 'Password or email is incorrect' })

        res.cookie("token", user.token)
        res.redirect('/')
    })
})

app.post('/register', urlencodedParser, (req, res) => {
    // Get variables from a req.body
    const { email, username, password, repassword } = req.body

    // Check is exists
    if (!email) return res.render('register', { message: "Please enter email address" })
    if (!username) return res.render('register', { message: "Please enter username address" })
    if (!password) return res.render('register', { message: "Please enter password address" })
    if (!repassword) return res.render('register', { message: "Please enter repassword address" })

    // Email validator
    if (email.length < 6) return res.render('register', { message: "The email address is too short" })
    if (email.length > 50) return res.render('register', { message: "The email address is too long" })
    if (!validator.validate(email)) return res.render('register', { message: "The email address is invalid" })

    // Username validator
    if (username.length < 3) return res.render('register', { message: "The username is too short" })
    if (username.length > 24) return res.render('register', { message: "The username is too long" })

    // Password validator
    if (password.length < 3) return res.render('register', { message: "The password is too short" })
    if (password.length > 24) return res.render('register', { message: "The password is too long" })

    // Is password that same like repassword
    if (password == repassword) {

        // Is email already registered
        // Let's find this email in database and if already exists
        userModel.findOne({ email: email }, (err, user) => {
            if (user == null) {
                // When email is not registered
                userModel.findOne({ username: username }, (err, userr) => {
                    if (userr == null) {
                        // When email is not registered
                        userModel.create({
                            username: username,
                            email: email,
                            password: password,
                            token: crypto.randomBytes(25).toString('hex'),
                            informations: "Not info yet",
                            location: "Not specified",
                            followers: [],
                            avatarURL: 'https://i.imgur.com/nL97ZLO.png',
                            endRegister: false
                        }, (registerErr, registerUser) => {
                            if (registerErr) return res.render('register', { message: "Something goes wrong" })

                            res.cookie("token", registerUser.token)
                            res.redirect('/')
                        })

                    } else {
                        // When username is already registered
                        return res.render('register', { message: "Username is taken!" })
                    }
                })

            } else {
                // When email is already registered
                return res.render('register', { message: "Email is taken!" })
            }
        })

    } else {
        return res.render('register', { message: "The passwords do not match" })
    }
})

app.get('/upload', (req, res) => {
    if (req.cookies.token == undefined) {
        res.redirect('/login')
    } else {
        userModel.findOne({ token: req.cookies.token }, (err, user) => {
            if (user == null) return res.redirect('/login')
            res.render('upload', { user: user, message: null })
        })
    }
})

app.get('/video/:NAME', (req, res) => {
    videoModel.findOne({ videoName: req.params.NAME }, (err, video) => {
        if (video == null) return res.render('404')

        if (req.cookies.token == undefined) {
            return res.render('video', { user: null, video: video })
        } else {
            userModel.findOne({ token: req.cookies.token }, (err, user) => {
                if (user == null) return res.render('video', { user: null, video: video })

                userModel.findOne({ token: video.authorToken  }, (err, userrrr) => {
                    res.render('video', { user: user, video: video, authorVideo: userrrr })
                })
            })
        }
        if (Math.floor(Math.random() * 7) + 1 == 3) {
            videoModel.findOneAndUpdate({ videoName: req.params.NAME }, { views: video.views + 1 }, (err, video) => {

            })
        }
    })
})

app.post('/upload', urlencodedParser, (req, res) => {
    if (!req.files) return res.render('upload', { message: "Please upload a video" })
    const { title, description } = req.body
    const { video } = req.files

    if (!title) return res.render('upload', { message: "Please enter title" })
    if (!description) return res.render('upload', { message: "Please enter description" })

    if (!video) return res.render('upload', { message: "Please upload a video" })

    if (!video.mimetype.startsWith("video/")) return res.render('upload', { message: "It must be a video format" })

    let nameFile = crypto.randomBytes(8).toString('hex')
    let nameVideo = nameFile + '.' + video.mimetype.split('/')[1]
    let pathName = __dirname + '/upload/videoUpload/' + nameVideo

    video.mv(pathName, (err) => {
        if (err) return res.render('upload', { message: "Something went wrong uploading video" })

        userModel.findOne({ token: req.cookies.token }, (err, user) => {
            if (user == null) return res.redirect('/login')

            videoModel.create({
                title: title,
                description: description,
                videoName: nameVideo,
                authorToken: user.token,
                views: 1,
                mainSite: Math.random() < 0.5,
            }, (err, videoDatabase) => {
                res.redirect(`video/${videoDatabase.videoName}`)
            })
        })
    })
});

app.get('/register/end', (req, res) => {
    if (req.cookies.token == undefined) {
        res.redirect('/login')
    } else {
        userModel.findOne({ token: req.cookies.token }, (err, user) => {
            if (user == null) return res.redirect('/login')

            if (user.endRegister == false) {
                return res.render('endRegister', { user: user, message: null })
            } else {
                return res.redirect('/')
            }
        })
    }
})

app.post('/register/end', urlencodedParser, (req, res) => {
    const { location, informations } = req.body

    if (!location == '') {
        userModel.findOneAndUpdate({ token: req.cookies.token }, { location: location }, (err, user) => {
            if (err) console.error(err)
        })
    }
    if (!informations == '') {
        userModel.findOneAndUpdate({ token: req.cookies.token }, { informations: informations }, (err, user) => {
            if (err) console.error(err)
        })
    }
    if (req.files) {
        if (req.files.avatar) {
            if (req.files.avatar.mimetype.startsWith("image/")) {
                let nameFile = crypto.randomBytes(9).toString('hex')
                let nameVideo = nameFile + '.' + req.files.avatar.mimetype.split('/')[1]
                let pathName = __dirname + '/upload/avatarsUpload/' + nameVideo

                req.files.avatar.mv(pathName, (err) => {
                    if (err) return res.render('endRegister', { user: user, message: "Something went wrong at uploading avatar please try later" })

                    userModel.findOneAndUpdate({ token: req.cookies.token }, { avatarURL: nameVideo }, (err, userRes) => {
                        if (err) console.log(err)
                    })
                })
            } else {
                return res.render('endRegister', { user: user, message: "It must be a image format" })
            }
        }
    }
    userModel.findOneAndUpdate({ token: req.cookies.token }, { endRegister: true }, (err, responseFromDatabase) => {
        if (err) return res.render('endRegister', { user: user, message: "Something went wrong at uploading avatar please try later" })
        res.redirect('/')
    })
})

app.get('/logout', (req, res) => {
    if (req.cookies.token == undefined) {
        return res.redirect('/login')
    } else {
        userModel.findOne({ token: req.cookies.token }, (err, user) => {
            if (user == null) return res.redirect('/login')

            res.cookie('token', '')
            return res.redirect('/login')
        })
    }
})

app.get('/user/:NAME', (req, res) => {
    userModel.findOne({ username: req.params.NAME }, (err, userFindParams) => {
        if (userFindParams == null) return res.render('404')
        videoModel.find({ authorToken: userFindParams.token }, (err, videoFindParams) => {
            if (req.cookies.token == undefined) {
                return res.render('user', { user: null, userFind: userFindParams, videosUser: videoFindParams })
            } else {
                userModel.findOne({ token: req.cookies.token }, (err, user) => {
                    if (user == null) return res.render('user', { user: null, userFind: userFindParams, videosUser: videoFindParams })
                    
                    return res.render('user', { user: user, userFind: userFindParams, videosUser: videoFindParams })
                })
            }
        })
    })
})

app.get('/dashboard', (req, res) => {
    if (req.cookies.token == undefined) {
        res.redirect('/login')
    } else {
        userModel.findOne({ token: req.cookies.token }, (err, user) => {
            if (user == null) return res.redirect('/login')

            videoModel.find({ authorToken: user.token }, (err, videos) => {
                res.render('dashboard/main', { user: user, videos: videos })
            })
        })
    }
})

app.post('/feedback', urlencodedParser, (req, res) => {
    const { Email, Subject, Description } = req.body

        if (!Email) {
            return res.render('feedback', { message: 'Please enter a email' });
        }
        if (!Subject) {
            return res.render('feedback', { message: 'Please enter a subject' });
        }
        if (!Description) {
            return res.render('feedback', { message: 'Please enter a description' });
        }
        fetch('https://api.ipdata.co/?api-key=c66fc16d58c306b8c73ed0f98335d136a83ed3e5d86ef0dbfb5e309c')
        .then(ress => ress.json())
        .then(json => {
            feedbackModel.create({ email: Email, subject: Subject, description: Description, ip: json.ip }, (err, results) => {
                res.render('thanksFeedback')
            })
        });
})


app.get('/feedback', (req, res) => {
    res.render('feedback', { message: null })
})

app.get('/report', (req, res) => {
    res.render('report', { message: null })
})

app.post('/report', urlencodedParser, (req, res) => {
    const { category, Email, Subject, Description } = req.body

    if (category === 'Bug') {
        if (!Email) {
            return res.render('report', { message: 'Please enter a email' });
        }
        if (!Subject) {
            return res.render('report', { message: 'Please enter a subject' });
        }
        if (!Description) {
            return res.render('report', { message: 'Please enter a description' });
        }
        fetch('https://api.ipdata.co/?api-key=c66fc16d58c306b8c73ed0f98335d136a83ed3e5d86ef0dbfb5e309c')
        .then(ress => ress.json())
        .then(json => {
            reportModel.create({ email: Email, type: category, subject: Subject, description: Description, ip: json.ip }, (err, results) => {
                res.render('thanks')
            })
        });
    } else if (category === 'User') {
        if (!Email) {
            return res.render('report', { message: 'Please enter a email' });
        }
        if (!Subject) {
            return res.render('report', { message: 'Please enter a subject' });
        }
        if (!Description) {
            return res.render('report', { message: 'Please enter a description' });
        }
        fetch('https://api.ipdata.co/?api-key=c66fc16d58c306b8c73ed0f98335d136a83ed3e5d86ef0dbfb5e309c')
        .then(ress => ress.json())
        .then(json => {
            reportModel.create({ email: Email, type: category, subject: Subject, description: Description, ip: json.ip }, (err, results) => {
                res.render('thanks')
            })
        });
    } else if (category === 'Video') {
        if (!Email) {
            return res.render('report', { message: 'Please enter a email' });
        }
        if (!Subject) {
            return res.render('report', { message: 'Please enter a subject' });
        }
        if (!Description) {
            return res.render('report', { message: 'Please enter a description' });
        }
        fetch('https://api.ipdata.co/?api-key=c66fc16d58c306b8c73ed0f98335d136a83ed3e5d86ef0dbfb5e309c')
        .then(ress => ress.json())
        .then(json => {
            reportModel.create({ email: Email, type: category, subject: Subject, description: Description, ip: json.ip }, (err, results) => {
                res.render('thanks')
            })
        });
    } else {
        return res.render('report', { message: 'Please enter a category' });
    }
})

/**
 *  =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  API Documentation
 *  =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 * 
 * 
 * 
 * 
 * 
 * 
 */

app.get('/developers/', (req, res) => {
    res.render('developer/main')
})

/**
 *  =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 *  API 
 *  =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
 * 
 * 
 * 
 * 
 * 
 * 
 */

app.get('/api/1v/', (req, res) => {
    res.json({ status: 200, message: 'OK', versionAPI: 1 })
})

app.get('/api/1v/follow/:KEY/:PROFILE', (req, res) => {
    userModel.findOne({ token: req.params.KEY }, (err, user) => {
        if (user == null) return res.json({ status: 400, message: "Invalid key"})

        userModel.findOne({ username: req.params.PROFILE }, (err, user2) => {
            if (user2 == null) return res.json({ status: 400, message: "Invalid username profile"})
    
            if (user2.followers.includes(req.params.KEY)) {
                userModel.findOneAndUpdate({ username: req.params.PROFILE }, { $pull: { followers: req.params.KEY } }, (err, userFollowers) => {
                    return res.json({ status: 200, message: 'Successly unfollowed', action: 'unfollow' });
                })
            } else {
                userModel.findOneAndUpdate({ username: req.params.PROFILE }, { $push: { followers: req.params.KEY } }, (err, userFollowers) => {
                    return res.json({ status: 200, message: 'Successly follow', action: 'follow' });
                })
            }
        })
    })
})

app.get('/api/1v/like/:KEY/:NAME', (req, res) => {
    userModel.findOne({ token: req.params.KEY }, (err, user) => {
        if (user == null) return res.json({ status: 400, message: "Invalid key"})

        videoModel.findOne({ videoName: req.params.NAME }, (err, video) => {
            if (video == null) { 
                res.json({ status: 400, message: "Invalid video name" });
                return
            }
            
            if (video.likes.includes(req.params.KEY)) {
                videoModel.findOneAndUpdate({ videoName: req.params.NAME }, { $pull: { likes: req.params.KEY } }, (err, videoLikes) => {
                    return res.json({ status: 200, message: 'Successly unliked', action: 'unliked', likes: videoLikes.likes.length - 1 });
                })
            } else {
                videoModel.findOneAndUpdate({ videoName: req.params.NAME }, { $push: { likes: req.params.KEY } }, (err, videoLikes) => {
                    return res.json({ status: 200, message: 'Successly liked', action: 'liked', likes: videoLikes.likes.length + 1 });
                })
            }
        })
    })
})

app.get('/api/1v/login/:KEY', (req, res) => {
    userModel.findOne({ token: req.params.KEY }, (err, user) => {
        if (user == null) return res.json({ status: 400, message: "Invalid key"})

        res.json({ 
            username: user.username,
            avatar: user.avatarURL,
            followers: user.followers.length,
            location: user.location,
            informations: user.informations
        })
    })
})

app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})