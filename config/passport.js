const bcrypt = require('bcryptjs')
const constants = require('./constants');

// 暗号化につかうキー
const APP_KEY = constants.TOKEN_SECRET_KEY;
const AUTOLOGIN_KEY = constants.KEYAUTOLOGIN;
const { v4: uuidv4 } = require('uuid');
uuidv4();

const pool = require('./database.js')
const jwt = require("jsonwebtoken");
var LocalStrategy = require('passport-local').Strategy
const crypto = require('crypto');

let accData = []

module.exports = function(passport) {
    passport.serializeUser(function(user, done) {
        done(null, user);
    });
    passport.deserializeUser(function(user, done) {
        done(null, user);
    });

    passport.use('login', new LocalStrategy({
            passReqToCallback: true
        },
        function(req, username, password, done) {
            loginUser()
            async function loginUser() {
                const client = await pool.connect()
                try {
                    await client.query('BEGIN')

                    var accData = await JSON.stringify(client.query('SELECT id, "username", "password" FROM "users" WHERE emailverifiedat is not null AND "username"=$1 and f_delete = false', [username], (err, result) => {
                        if (err) {
                            return done(err)
                        }

                        if (result.rows[0] == null) {
                            return done(null, false, req.flash('message', "!!!ユーザー名或いはパスワード名が間違っています!!!"))
                        } else {
                            if (password === AUTOLOGIN_KEY) {
                                console.log('User [' + req.body.username + '] has logged in.');
                                return done(null, { username: result.rows[0].username, id: result.rows[0].id });
                            }

                            bcrypt.compare(password, result.rows[0].password, (err, valid) => {
                                if (err) {
                                    console.log("Error on password validation")
                                    return done(err)
                                }
                                if (valid) {
                                    console.log('User [' + req.body.username + '] has logged in.');

                                    return done(null, { username: result.rows[0].username, id: result.rows[0].id });
                                } else {
                                    return done(null, false, req.flash('message', "!!!ユーザー名或いはパスワード名が間違っています!!!"))
                                }
                            })
                        }
                    }))
                } catch (e) {
                    throw (e)
                }
            }
        }))

    passport.use('register', new LocalStrategy({
            usernameField: 'usernameRegi',
            passwordField: 'passwordRegi',
            passReqToCallback: true
        },
        function(req, usernameRegi, passwordRegi, done) {
            registerUser()
            async function registerUser() {
                const client = await pool.connect()
                try {
                    await client.query('BEGIN')
                    let passHash = await bcrypt.hash(req.body.passwordRegi, 8)
                    await JSON.stringify(client.query('SELECT id FROM users WHERE username=($1) and f_delete = false', [req.body.usernameRegi], (err, result) => {

                        let dtBirthday = new Date(req.body.birthdayYear + "-" + req.body.birthdayMonth + "-" + req.body.birthdayDay);

                        if (err) {
                            return done(err)
                        }

                        if (result.rows[0]) {
                            return done(null, false, req.flash('message', 'メールを送信しました。URLをクリックしてアカウントを有効化してください！\n\nもし、このメールが迷惑メールフォルダに入ってしまった場合は、お手数ですが迷惑メールフォルダもご確認ください。もし届いていない場合は登録済みの可能性があります。'))
                        } else {
                            let userID = uuidv4();
                            client.query('INSERT INTO users (id, username, password, birthday, sex, country) VALUES ($1, $2, $3, $4, $5, $6)', [userID, req.body.usernameRegi, passHash, dtBirthday, req.body.sex, req.body.country], (err, result) => {
                                if (err) {
                                    console.log(err)
                                } else {
                                    client.query('COMMIT')
                                    console.log('User [' + req.body.usernameRegi + '] has registered.')
                                    sendEmailToken(req.body.usernameRegi, req.get('origin'), userID, 'activate_useraccount@ety-book.com', 'アカウント', '/verify/');
                                    return done(null, false, req.flash('message', 'メールを送信しました。URLをクリックしてアカウントを有効化してください！\n\nもし、このメールが迷惑メールフォルダに入ってしまった場合は、お手数ですが迷惑メールフォルダもご確認ください。'))
                                }
                            });

                        }
                    }))
                } catch (e) {
                    throw (e)
                }
            }
        }))

    passport.use('updatePassword', new LocalStrategy({
            usernameField: 'passwordNow',
            passwordField: 'newpass',
            passReqToCallback: true
        },
        function(req, password, newpass, done) {
            let username = (req.user.username).toLowerCase()
            updatePassword()
            async function updatePassword() {
                const client = await pool.connect()
                try {
                    await client.query('BEGIN')
                    let newPassHash = await bcrypt.hash(req.body.newpass, 8)
                    var accData = await JSON.stringify(client.query('SELECT id, "username", "password" FROM "users" WHERE "username"=$1 and f_delete = false', [req.user.username.toLowerCase()], (err, result) => {
                        if (err) {
                            return done(err)
                        }

                        if (result.rows[0] == null) {
                            return done(null, false, req.flash('message', 'Error on changing password. Please try again'))
                        } else {
                            bcrypt.compare(req.body.passwordNow, result.rows[0].password, (err, valid) => {
                                if (err) {
                                    console.log("Error on current password validation")
                                    return done(err)
                                }
                                if (valid) {
                                    client.query('UPDATE users SET password=($1), remembertoken = null WHERE username=($2) and f_delete = false', [newPassHash, req.user.username], (err, result) => {
                                        if (err) {
                                            console.log(err)
                                        } else {
                                            client.query('COMMIT')
                                            console.log('User [' + req.user.username + '] has updated their password.')
                                                //console.log(result)
                                                //return done(null, { username: req.user.username }, req.flash('message', 'Your password has been updated.'))
                                            return done(null, false, req.flash('message', 'パスワードの更新成功！！！'))
                                        }
                                    });
                                } else {
                                    req.flash('message', "現在のパスワードが間違っています")
                                    return done(null, false)
                                }
                            })
                        }


                    }))
                } catch (e) {
                    throw (e)
                }
            }
        }))

    passport.use('updateMail', new LocalStrategy({
            usernameField: 'mailNow',
            passwordField: 'newmail',
            passReqToCallback: true
        },
        function(req, mailNow, newmail, done) {
            let username = (req.user.username).toLowerCase()
            updatePassword()
            async function updatePassword() {
                const client = await pool.connect()
                let userID = "";
                try {
                    await client.query('BEGIN')
                    var accData = await JSON.stringify(client.query('SELECT id, "username", "password" FROM "users" WHERE "username"=$1 and f_delete = false', [req.body.mailNow], (err, result) => {
                        if (err) {
                            return done(err)
                        }

                        if (result.rows[0] == null) {
                            return done(null, false, req.flash('message', 'Error on changing password. Please try again'))
                        } else {
                            if (err) {
                                console.log("Error on current password validation")
                                return done(err)
                            }
                            userID = (result.rows)[0]["id"];
                            client.query('UPDATE users SET usernamechange=($1) WHERE username=($2) and f_delete = false', [req.body.newmail, req.body.mailNow], (err, result) => {
                                if (err) {
                                    console.log(err)
                                } else {
                                    client.query('COMMIT')
                                    sendEmailToken(req.body.newmail, req.get('origin'), userID, 'change_email@ety-book.com', 'メールアドレス変更', '/change_email/');
                                    console.log('User [' + req.body.newmail + '] has updated their Mail.')
                                    return done(null, false, req.flash('message', 'メール送信しました。URLをクリックしてメールアドレス変更を有効化してください！'))
                                }
                            });
                        }


                    }))
                } catch (e) {
                    throw (e)
                }

            }
        }))
}

function sendEmailToken(argEmail, hostUrl, userID, argFromEmail, argWhat, argUrlDir) {
    const hash = crypto.createHash('sha1')
        .update(argEmail)
        .digest('hex');
    const now = new Date();
    const expiration = now.setHours(now.getHours() + 1); // 1時間だけ有効
    let verificationUrl = hostUrl + argUrlDir + userID + '/' + hash + '?expires=' + expiration;
    const signature = crypto.createHmac('sha256', APP_KEY)
        .update(verificationUrl)
        .digest('hex');
    verificationUrl += '&signature=' + signature;

    // using SendGrid's Node.js Library
    // https://github.com/sendgrid/sendgrid-nodejs
    let mailMaintext = 'Ety-book・' + argWhat + 'の有効化を行ってください。\n' +
        '以下のリンク先をクリックしてください\n\n\n' + verificationUrl + '\n\n\n' +
        '心当たりがない場合は 、 \n' +
        '―――――――――――――――――――――――――――\n' +
        'Ety-book\n' +
        //'URL: https://ety-book.com/\n' +
        //'TEL: 03 - 6370 - 6601(平日10時から18時)\n' +
        //'お問い合せ： https: //ety-book.com/contact/\n' +
        '―――――――――――――――――――――――――――\n' +
        '本メールに心当たりが無い場合は破棄をお願いいたします。\n' +
        '送信専用メールアドレスのため、 直接の返信はできません。';
    let export_function = require('./method.js');
    export_function.SendMail(argEmail, argFromEmail,
        '【Ety-book・アカウントの有効化】' + argWhat + 'の有効化のお知らせ', mailMaintext);

    return
}