const constants = require('./config/constants');
const express = require('express')
const session = require('express-session')
const passport = require('passport')
const flash = require('connect-flash')
const bodyParser = require('body-parser')

const app = express()
const PORT = process.env.PORT || constants.SERVER_PORT

const routes = require('./routes/index')

app.set('view engine', 'ejs')
app.use(session({
    //secret: 'thatsecretthinggoeshere',
    secret: '2B2jiR-CLA-z7CuGwmFBfSrgm_DKkt4QFb_9DC3unfaDATpUNmuSLGZn',
    resave: false,
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(bodyParser.json())
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())

app.use(function(req, res, next) {
    res.locals.message = req.flash('message');
    next();
});

app.use('/', routes)
app.set("views", `${__dirname}/views`);
app.set("view engine", "ejs");

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
require('./config/passport')(passport)

app.listen(PORT, () => {
    console.log(`Application server started on port: ${PORT}`)
})