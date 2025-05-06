const express = require('express')
const cookieParser = require('cookie-parser');
const router = express.Router()
const passport = require('passport')
const bodyParser = require("body-parser");
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/database.js')
const constants = require('../config/constants.js')
const { triggerAsyncId } = require('async_hooks');


const app = express()

// 暗号化につかうキー
const APP_KEY = constants.TOKEN_SECRET_KEY;
const AUTOLOGIN_KEY = constants.KEYAUTOLOGIN;

//正規表現
const regPassCheck = /^[a-z\d]{8,100}$/i;
const regexMailCheck = /^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}$/;

router.use(cookieParser());

async function QueryRecord(sql, values) {
    try {
        const result = await pool.query(sql, values); // pool.queryを使用してデータベースへのクエリを実行
        return result;
    } catch (err) {
        console.error(err);
    }
}

async function Synchronization_QueryRecord(sql, values) {
    try {
        const result = await QueryRecord(sql, values);
        return result; // 追加
    } catch (err) {
        console.error(err);
    }
}

async function InsertNotRegister(loginUser, etymology, etymology_mean) {
    var sql = 'SELECT id FROM public.table_etymology_register WHERE f_delete = false AND userid = $1 and etymology = $2';
    var arrValues = [loginUser, etymology];

    try {
        let result = await Synchronization_QueryRecord(sql, arrValues); // 変更
        let num = result.rowCount;
        if (num == 0) {
            const sqlInsert = 'INSERT INTO public.table_etymology_register(userid, etymology, etymology_mean) VALUES ($1, $2, $3)';
            const values = [loginUser, etymology, etymology_mean];
            await Synchronization_QueryRecord(sqlInsert, values); // 変更
        }
    } catch (err) {
        console.error(err);
    }
}

router.get('/', (req, res, next) => {
    if (req.isAuthenticated()) {
        req.flash('message', 'ログイン済みです')
        res.redirect('/home')
    } else if (req.cookies.remember_me) {
        const [rememberToken, hash] = req.cookies.remember_me.split('|');
        req.body.username = null;
        req.body.password = null;
        LoginUser()
        async function LoginUser() {
            const client = await pool.connect()
            try {
                await client.query('BEGIN')
                let sql = 'SELECT id, username, password FROM users WHERE f_delete = false';
                var accData = await JSON.stringify(client.query(sql, (err, result) => {
                    if (err) {
                        req.flash('message', 'エラー発生！！')
                        res.redirect('/login')
                        return
                    }

                    num = result.rowCount;
                    if (num === 0) {
                        req.flash('message', '登録されているユーザーがいません!!')
                        res.redirect('/login')
                    }
                    for (let i = 0; i < num; i++) {
                        const verifyingHash = crypto.createHmac('sha256', APP_KEY)
                            .update(result.rows[i]["id"] + '-' + rememberToken)
                            .digest('hex');

                        if (hash === verifyingHash) {

                            // セキュリティ的はここで remember_me を再度更新すべき
                            const rememberToken = crypto.randomBytes(20).toString('hex'); // ランダムな文字列
                            const hash = crypto.createHmac('sha256', APP_KEY)
                                .update(result.rows[i]["id"] + '-' + rememberToken)
                                .digest('hex');

                            sql = "UPDATE public.users SET remembertoken = $1 WHERE username = $2 and f_delete = false";
                            var arrValuesUpdate = [rememberToken, result.rows[i]["username"]];
                            Synchronization_QueryRecord(sql, arrValuesUpdate);

                            res.cookie('remember_me', rememberToken + '|' + hash, {
                                path: '/',
                                maxAge: 5 * 365 * 24 * 60 * 60 * 1000 // 5年
                            });


                            req.body.username = result.rows[i]["username"];
                            req.body.password = AUTOLOGIN_KEY;
                            //req.body.password = result.rows[i]["password"];
                            next();
                        }
                    }

                }))
            } catch (e) {
                res.render('login')
            } finally {
                await client.query("COMMIT")
                await client.on('drain', client.end.bind(client));
                console.log('Client disconnected successfully')
            }
        }

    } else {
        res.render('login')
    }
}, passport.authenticate('login', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true
}))

router.get('/introduction', (req, res) => {
    res.render('introduction', {
        referNum: "2"
    })
})

router.get('/how_to_use', (req, res) => {
    res.render('how_to_use')
})

router.get('/privacy_policy', (req, res) => {
    res.render('privacy_policy')
})

router.get('/terms_of_service', (req, res) => {
    res.render('terms_of_service')
})

router.post('/introduction', (req, res) => {
    let sql = "INSERT INTO public.table_inquiry(name, email, subject, inquiry) VALUES ($1, $2, $3, $4)";
    let arrValueSQL = [(req.body.name).trim(), (req.body.email).trim(), (req.body.subject).trim(), (req.body.message).trim()];
    Synchronization_QueryRecord(sql, arrValueSQL);

    let export_function = require('../config/method.js');
    let mailMaintext = 'Ety-book・お問い合わせありがとうございます\n' +
        'お世話になっております。お問い合わせありがとうございました。\n' +
        '----------------------------------------\n' +
        (req.body.message).trim() + '\n\n' +
        '以下の内容でお問い合わせを受け付けいたしました。数日以内に、 担当者よりご連絡いたしますので\n' +
        '今しばらくお待ちくださいませ。 \n' +
        '―――――――――――――――――――――――――――\n' +
        'Ety-book\n' +
        //'URL: https://ety-book.com/\n' +
        //'TEL: 03 - 6370 - 6601(平日10時から18時)\n' +
        //'お問い合せ： https: //ety-book.com/contact/\n' +
        '―――――――――――――――――――――――――――\n' +
        '本メールに心当たりが無い場合は破棄をお願いいたします。\n' +
        '送信専用メールアドレスのため、 直接の返信はできません。';

    export_function.SendMail((req.body.email).trim(), 'inquiry@ety-book.com',
        '【Ety-book・ログイン】お問い合わせ完了のお知らせ', mailMaintext);

    mailMaintext = 'Ety-book・お問い合わせがありました\n' +
        'お問い合わせがありました。\n' +
        '以下の内容でお問い合わせを受け付けいたしました。ご確認ください\n' +
        '----------------------------------------\n' +
        (req.body.message).trim() + '\n\n' +
        '―――――――――――――――――――――――――――\n' +
        'Ety-book\n' +
        //'URL: https://ety-book.com/\n' +
        //'TEL: 03 - 6370 - 6601(平日10時から18時)\n' +
        //'お問い合せ： https: //ety-book.com/contact/\n' +
        '―――――――――――――――――――――――――――\n' +
        '本メールに心当たりが無い場合は破棄をお願いいたします。\n' +
        '送信専用メールアドレスのため、 直接の返信はできません。';

    export_function.SendMail(constants.INQUIRY_EMAIL, 'inquiry@ety-book.com',
        '【Ety-book・ログイン】お問い合わせを受信しました', mailMaintext);



    res.render('introduction', {
        message: "お問い合わせ完了"
    })
})

router.get('/introduction_faq', (req, res) => {
    res.render('introduction_faq', {
        referNum: "1"
    })
})



router.get('/login', (req, res, next) => {
    if (req.isAuthenticated()) {
        req.flash('message', 'ログイン済みです')
        res.redirect('/home')
    } else {
        res.render('login')
    }
}, passport.authenticate('login', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true
}))


router.post('/login', (req, res, next) => {
    if (req.isAuthenticated()) {
        req.flash('message', 'ログイン済みです')
        res.redirect('/home')
    } else {
        if (!req.body.remember) { // 次回もログインを省略しない場合
            res.clearCookie('remember_me');
            return next();
        }

        UpdateToken()
        async function UpdateToken() {
            const client = await pool.connect()
            try {
                await client.query('BEGIN')
                let sql = 'SELECT id, "username", "password" FROM "users" WHERE "username"=$1 and f_delete = false';
                var accData = await JSON.stringify(client.query(sql, [(req.body.username).toLowerCase()], (err, result) => {

                    if (err) {
                        return done(err)
                    }

                    if (result.rows[0] == null) {
                        req.flash('message', '!!!ユーザー名或いはパスワード名が間違っています!!!')
                        res.redirect('/login')
                    } else {
                        const rememberToken = crypto.randomBytes(20).toString('hex'); // ランダムな文字列
                        const hash = crypto.createHmac('sha256', APP_KEY)
                            .update(result.rows[0]["id"] + '-' + rememberToken)
                            .digest('hex');

                        sql = "UPDATE public.users SET remembertoken = $1 WHERE username = $2 and f_delete = false";
                        var arrValuesUpdate = [rememberToken, (req.body.username)];
                        Synchronization_QueryRecord(sql, arrValuesUpdate);

                        res.cookie('remember_me', rememberToken + '|' + hash, {
                            path: '/',
                            maxAge: 5 * 365 * 24 * 60 * 60 * 1000 // 5年
                        });
                    }
                }))
            } catch (e) {
                req.flash('message', 'エラー発生!!')
                res.redirect('/')
            } finally {
                await client.query("COMMIT")
                await client.on('drain', client.end.bind(client));
                console.log('Client disconnected successfully')
            }
        }

        if (String(req.body.username).length === 0) {
            req.flash('message', 'ユーザー名が入力されていません')
            res.redirect('/login')
        }

        if (String(req.body.password).length === 0) {
            req.flash('message', 'パスワードが入力されていません')
            res.redirect('/login')
        }

        next();
    }
}, passport.authenticate('login', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true
}))



router.get('/forgetchangepass/:token', (req, res) => {
    const getValDirToken = req.params.token;

    var sql = 'SELECT email, password_tokensentat FROM public.table_password_resets WHERE password_token = $1';
    var arrValues = [getValDirToken];

    pool.query(sql, arrValues, function(err, result, fields) { // pool.queryを使用してデータベースへのクエリを実行
        let num = result.rowCount;
        if (num === 0) {
            res.status(422).send('このURLは正しくありません。');
            return;
        }
        let an_hour_ago = new Date(new Date() - (1000 * 60 * 60));
        if (result.rows[0]["password_tokensentat"] > an_hour_ago) {
            res.render('forgetpass_update', {
                password_reset_token: getValDirToken
            })
            return;
        }
    });
});

router.post('/forgetchangepass', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/login')
    } else {
        let pass = req.body.password.trim();
        let passConf = req.body.passConf;
        let token = req.body.password_reset_token;

        var result = (pass).match(regPassCheck);
        if (!(result)) {
            res.render('forgetpass_update', {
                message: '!!!半角英数字8文字以上100文字以下でお願いします!!!',
                password_reset_token: token,
            })
            return;
        }

        if (pass != passConf) {
            res.render('forgetpass_update', {
                message: '!!!パスワードとパスワード(確認用) が一致していません!!!',
                password_reset_token: token,
            })
            return;
        }

        var sql = 'SELECT email, password_token FROM public.table_password_resets WHERE password_token = $1';
        var arrValues = [token];

        let strEmail = "";
        var num = 0;
        pool.query(sql, arrValues, function(err, result, fields) { // pool.queryを使用してデータベースへのクエリを実行
            if (err) return console.error(err);
            num = result.rowCount;
            if (num == 0) {
                res.render('forgetpass_update', {
                    message: 'エラー発生！'
                })
                return;
            }
            let hashed_password = bcrypt.hashSync(pass, 8);
            sql = "UPDATE public.users SET password = $1 WHERE username = $2 and f_delete = false"
            arrValues = [hashed_password, result.rows[0]["email"]];
            Synchronization_QueryRecord(sql, arrValues);

            sql = 'DELETE FROM public.table_password_resets WHERE password_token = $1';
            arrValues = [token];
            Synchronization_QueryRecord(sql, arrValues);


        });

        res.render('forgetpass_update', {
            message: 'パスワードの変更が完了しました！'
        })

        return;

    }
})

router.get('/forgetpass', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/login')
    } else {
        res.render('forgetpass', {
            message: res.locals.message
        })
    }
})

router.post('/forgetpass', (req, res, next) => {
    let userForgetpass = String(req.body.usernameForgetpass);
    if (!(regexMailCheck.test(userForgetpass))) {
        req.flash('message', '!!!メールアドレスを入力してください!!!');
        res.redirect('/forgetpass')
        return;
    }

    //https://stackoverflow.com/questions/13119786/syntax-error-at-end-of-input-in-postgresql
    var sql = 'SELECT id FROM public.users WHERE emailverifiedat is not null AND username = $1 and f_delete = false';
    var arrValues = [userForgetpass];

    var num = 0;
    pool.query(sql, arrValues, function(err, result, fields) {
        if (err) return console.error(err);
        num = result.rowCount;
        if (num == 0) {
            res.render('forgetpass', {
                message: 'メール送信完了！'
            })
        }

    });

    sql = 'SELECT email FROM public.table_password_resets WHERE email = $1';
    num = 0;
    pool.query(sql, arrValues, function(err, result, fields) {
        if (err) return console.error(err);
        num = result.rowCount;

        if (num == 0) {
            sql = "INSERT INTO public.table_password_resets(password_token, password_tokensentat, email) VALUES ($1, $2, $3)";
        } else {
            sql = "UPDATE public.table_password_resets SET password_token = $1, password_tokensentat = $2 WHERE email = $3";
        }

        const randomStr = Math.random().toFixed(36).substring(2, 38);
        let token = crypto.createHmac('sha256', APP_KEY)
            .update(randomStr)
            .digest('hex');
        var arrValueQry = [token, new Date().toLocaleString(), userForgetpass];
        Synchronization_QueryRecord(sql, arrValueQry);

        let sendUrl = req.get('origin') + "/forgetchangepass/" + token;
        let export_function = require('../config/method.js');
        let mailMaintext = 'Ety-book・ログインのパスワードリセットの申請を受け付けました。\n' +
            '1時間以内に新パスワードを下記リンクをクリックして\n\n\n' + sendUrl + '\n\n\n' +
            'パスワードリセットの申請に心当たりがない場合は 、 \n' +
            '―――――――――――――――――――――――――――\n' +
            'Ety-book\n' +
            //'URL: https://ety-book.com/\n' +
            //'TEL: 03 - 6370 - 6601(平日10時から18時)\n' +
            //'お問い合せ： https: //ety-book.com/contact/\n' +
            '―――――――――――――――――――――――――――\n' +
            '本メールに心当たりが無い場合は破棄をお願いいたします。\n' +
            '送信専用メールアドレスのため、 直接の返信はできません。';
        export_function.SendMail(userForgetpass, 'forgetpass@ety-book.com',
            '【Ety-book・ログイン】パスワードリセットのお知らせ', mailMaintext);
    });
    res.render('forgetpass', {
        message: 'メール送信完了！'
    })
    return;

});

router.get('/register', (req, res) => {
    res.render('register', {
        title: 'Register',
        message: res.locals.message
    })
})

router.post('/register', (req, res, next) => {
    if (req.isAuthenticated()) {
        req.flash('message', 'You are already logged in.')
        res.redirect('/login')
    } else {
        //let user = (req.body.username).toLowerCase()
        let user = req.body.usernameRegi;
        let pass = req.body.passwordRegi.trim();
        let passConf = req.body.passConfRegi;

        if (!(regexMailCheck.test(user))) {
            res.render('register', {
                message: '!!!メールアドレスを入力してください!!!',
                birthdayYear: req.body.birthdayYear,
                birthdayMonth: req.body.birthdayMonth,
                birthdayDay: req.body.birthdayDay,
                sex: req.body.sex,
                birthdayYear: req.body.birthdayYear,
                usernameRegi: req.body.usernameRegi,
                passwordRegi: req.body.passwordRegi,
                passConfRegi: req.body.passConfRegi
            })
            return;
        }

        //var result = (newpass).match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,128}$/);
        var result = (pass).match(regPassCheck);
        if (!(result)) {
            res.render('register', {
                message: '!!!半角英数字8文字以上100文字以下でお願いします!!!',
                birthdayYear: req.body.birthdayYear,
                birthdayMonth: req.body.birthdayMonth,
                birthdayDay: req.body.birthdayDay,
                sex: req.body.sex,
                birthdayYear: req.body.birthdayYear,
                usernameRegi: req.body.usernameRegi,
                passwordRegi: req.body.passwordRegi,
                passConfRegi: req.body.passConfRegi
            })
            return;
        }

        if (pass != passConf) {
            req.flash('message', '!!!パスワードとパスワード(確認用)が一致していません!!!');
            res.render('register', {
                message: '!!!パスワードとパスワード(確認用)が一致していません!!!',
                birthdayYear: req.body.birthdayYear,
                birthdayMonth: req.body.birthdayMonth,
                birthdayDay: req.body.birthdayDay,
                sex: req.body.sex,
                birthdayYear: req.body.birthdayYear,
                usernameRegi: req.body.usernameRegi,
                passwordRegi: req.body.passwordRegi,
                passConfRegi: req.body.passConfRegi
            })
            return;
        }

        next()
    }
}, passport.authenticate('register', {
    successRedirect: '/register',
    failureRedirect: '/register',
    failureFlash: true
}))

router.get('/verify/:id/:hash', (req, res) => {
    const getValDirId = "{" + req.params.id + "}";


    //https://stackoverflow.com/questions/13119786/syntax-error-at-end-of-input-in-postgresql
    var sql = 'SELECT username, password, remembertoken, emailverifiedat FROM public.users WHERE emailverifiedat is null AND id = $1 and f_delete = false';
    var arrValues = [getValDirId];

    var num = 0;
    pool.query(sql, arrValues, function(err, result, fields) {
        num = result.rowCount;
        if (num === 0) {
            res.status(422).send('このURLは正しくありません。');
            return;
        }

        if (result.rows[0]["emailverifiedat"]) { // すでに本登録が完了している場合
            res.redirect("/login");
            return;
        }

        const now = new Date();
        const hash = crypto.createHash('sha1')
            .update(result.rows[0]["username"])
            .digest('hex');
        const isCorrectHash = (hash === req.params.hash);
        const isExpired = (now.getTime() > parseInt(req.query.expires));
        const verificationUrl = req.protocol + '://' + req.headers.host + req.originalUrl.split('&signature=')[0];
        const signature = crypto.createHmac('sha256', APP_KEY)
            .update(verificationUrl)
            .digest('hex');
        const isCorrectSignature = (signature === req.query.signature);

        if (!isCorrectHash || !isCorrectSignature || isExpired) {
            res.status(422).send('このURLはすでに有効期限切れか、正しくありません。');
        } else { // 本登録
            const nowDate = new Date();
            sql = "UPDATE public.users SET emailverifiedat = $1  WHERE id = $2 and f_delete = false";
            const values = [nowDate, getValDirId];
            Synchronization_QueryRecord(sql, values);
            res.redirect("/login");
            return;
        }
    });
});

router.get('/change_email/:id/:hash', (req, res) => {
    const valDirId = req.params.id;
    const valDirsername = req.params.username;


    //https://stackoverflow.com/questions/13119786/syntax-error-at-end-of-input-in-postgresql
    var sql = 'SELECT username, password, remembertoken, emailverifiedat, usernamechange FROM public.users WHERE emailverifiedat is not null AND id = $1 and f_delete = false';
    var arrValues = [valDirId];

    var num = 0;
    pool.query(sql, arrValues, function(err, result, fields) {
        num = result.rowCount;
        if (num === 0) {
            res.status(422).send('このURLは正しくありません。');
            return;
        }


        const now = new Date();
        const hash = crypto.createHash('sha1')
            .update(result.rows[0]["usernamechange"])
            .digest('hex');
        const isCorrectHash = (hash === req.params.hash);
        const isExpired = (now.getTime() > parseInt(req.query.expires));
        const verificationUrl = req.protocol + '://' + req.headers.host + req.originalUrl.split('&signature=')[0];
        const signature = crypto.createHmac('sha256', APP_KEY)
            .update(verificationUrl)
            .digest('hex');
        const isCorrectSignature = (signature === req.query.signature);

        if (!isCorrectHash || !isCorrectSignature || isExpired) {
            res.status(422).send('このURLはすでに有効期限切れか、正しくありません。');
        } else { // 本登録
            sql = "UPDATE public.users SET username = $1, remembertoken = null  WHERE id = $2 and f_delete = false";
            const values = [result.rows[0]["usernamechange"], valDirId];
            Synchronization_QueryRecord(sql, values);
            res.redirect("/login");
            return;
        }
    });
});

router.get('/logout', (req, res) => {
    //https://stackoverflow.com/questions/72336177/error-reqlogout-requires-a-callback-function
    req.logout('{' + req.user.id + '}', err => {
        if (err) return next(err);
        res.redirect("/login");
    });
});

router.get("/home", async function(req, res) {
    if (req.isAuthenticated()) {
        const sql = 'SELECT id, mainWord, etymology01, etymology02, etymology03 FROM public.table_word_register WHERE userid = $1 and f_delete = false order by registertimestamp desc';
        const values = ['{' + req.user.id + '}'];

        const result = await pool.query(sql, values, function(err, result, fields) { // pool.queryを使用してデータベースへのクエリを実行
            if (err) return console.error(err);
            res.render('home', {
                items: result.rows,
                comment_left: "!-- ",
                comment_right: "--"
            })
        });
    } else {
        res.redirect('/')
    }
});

router.post("/home", async function(req, res) {
    if (req.isAuthenticated()) {
        const searchWord = req.body.searchWord.trim();

        //https://qiita.com/naru0504/items/06b687d6a174286756da
        //https://mebee.info/2021/09/19/post-24800/
        let sql = '';

        sql = 'SELECT mainword, etymology01, etymology02, etymology03, registertimestamp \
        FROM public.table_word_register WHERE userid = $1 and f_delete = false and \ ';


        const values = ['{' + req.user.id + '}', '%' + searchWord + '%'];
        sql = sql + '(mainword ILIKE $2 or mean01 ILIKE $2 or \
        mean02 ILIKE $2 or mean03 ILIKE $2 or mean04 ILIKE $2 or \
        mean05 ILIKE $2 or mean06 ILIKE $2 or mean07 ILIKE $2 or \
        mean08 ILIKE $2 or mean09 ILIKE $2 or etymology01 ILIKE $2 or \
        etymology_mean01 ILIKE $2 or etymology02 ILIKE $2 or \
        etymology_mean02 ILIKE $2 or etymology03 ILIKE $2 or \
        etymology_mean03 ILIKE $2 or relatedword01 ILIKE $2 or \
        relatedword02 ILIKE $2 or relatedword03 ILIKE $2 or \
        relatedword04 ILIKE $2 or relatedword05 ILIKE $2 or \
        relatedword06 ILIKE $2 or relatedword07 ILIKE $2 or \
        relatedword08 ILIKE $2 or relatedword09 ILIKE $2 or \
        relatedword10 ILIKE $2 or relatedword11 ILIKE $2 or \
        relatedword12 ILIKE $2 or examplesentence01 ILIKE $2 or \
        examplesentence_jpn_01 ILIKE $2 or examplesentence_source_01 ILIKE $2 or \
        examplesentence_url_01 ILIKE $2 or examplesentence02 ILIKE $2 or \
        examplesentence_jpn_02 ILIKE $2 or examplesentence_source_02 ILIKE $2 or \
        examplesentence_url_02 ILIKE $2 or examplesentence03 ILIKE $2 or \
        examplesentence_jpn_03 ILIKE $2 or examplesentence_source_03 ILIKE $2 or \
        examplesentence_url_03 ILIKE $2 or examplesentence04 ILIKE $2 or \
        examplesentence_jpn_04 ILIKE $2 or examplesentence_source_04 ILIKE $2 or \
        examplesentence_url_04 ILIKE $2 or wordregistermemo ILIKE $2) ORDER BY registertimestamp desc'


        const result = await pool.query(sql, values, function(err, result, fields) {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }
            res.render('home', {
                items: result.rows,
                comment_left: "!-- ",
                comment_right: "--"
            });
        });
    } else {
        res.redirect('/')
    }
});

router.get("/search", function(req, res) {
    if (req.isAuthenticated()) {
        res.render('search')
    } else {
        res.redirect('/')
    }
});

router.post("/search", async function(req, res) {
    if (req.isAuthenticated()) {
        const typeWordOrEtymology = req.body.typeWordOrEtymology;
        const partialMatchExactMatch = req.body.partialMatchExactMatch;
        const wordOrEtymology = req.body.wordOrEtymology.trim();


        //https://qiita.com/naru0504/items/06b687d6a174286756da
        //https://mebee.info/2021/09/19/post-24800/
        let sql = '';

        if (typeWordOrEtymology === "単語") {
            sql = 'SELECT mainword, etymology01, etymology02, etymology03, registertimestamp \
            FROM public.table_word_register WHERE userid = $1 and f_delete = false and \
            mainword ';
        }

        if (typeWordOrEtymology === "語源") {
            sql = 'SELECT etymology, registertimestamp \
            FROM public.table_etymology_register WHERE userid = $1 and f_delete = false and \
            etymology ';
        }


        let values = [];
        let selectedExactMatch = null;
        let selectedpartialMatch = null;

        if (partialMatchExactMatch === "完全一致") {
            values = ['{' + req.user.id + '}', wordOrEtymology];
            sql = sql + '= $2 ORDER BY registertimestamp desc'
            selectedExactMatch = "selected";
        }

        if (partialMatchExactMatch === "部分一致") {
            values = ['{' + req.user.id + '}', '%' + wordOrEtymology + '%'];
            sql = sql + 'ILIKE $2 ORDER BY registertimestamp desc'
            selectedpartialMatch = "selected";;
        }

        var num = 0;
        const result = await pool.query(sql, values, function(err, result, fields) {
            if (err) return console.error(err);

            if (typeWordOrEtymology === "単語") {
                res.render('search_word', {
                    items: result.rows,
                    sendWordOrEtymology: wordOrEtymology,
                    wordSelected: "selected",
                    etymologySelected: null,
                    ExactMatch: selectedExactMatch,
                    partialMatch: selectedpartialMatch,
                    comment_left: "!-- ",
                    comment_right: "--"
                })
                return;
            }

            if (typeWordOrEtymology === "語源") {
                res.render('search_etymology', {
                    items: result.rows,
                    sendWordOrEtymology: wordOrEtymology,
                    wordSelected: null,
                    etymologySelected: "selected",
                    ExactMatch: selectedExactMatch,
                    partialMatch: selectedpartialMatch,
                    comment_left: "!-- ",
                    comment_right: "--"
                })
                return;
            }

        });

    } else {
        res.redirect('/')
    }

});

router.get("/word/", async function(req, res) {
    if (req.isAuthenticated()) {
        res.redirect('/home')
    } else {
        res.redirect('/')
    }
});

router.get("/etymology/", async function(req, res) {
    if (req.isAuthenticated()) {
        res.redirect('/home')
    } else {
        res.redirect('/')
    }
});

router.get("/word/:englishWord", async function(req, res) {
    if (req.isAuthenticated()) {
        const englishWord = String(req.params.englishWord);

        var sql = 'SELECT id, userid, mainWord, mean01, mean02, mean03, \
        mean04, mean05, mean06, mean07, mean08, mean09, etymology01, \
        etymology_mean01, etymology02, etymology_mean02, etymology03, \
        etymology_mean03, relatedWord01, relatedWord02, relatedWord03, \
        relatedWord04, relatedWord05, relatedWord06, relatedWord07, \
        relatedWord08, relatedWord09, relatedWord10, relatedWord11, \
        relatedWord12, exampleSentence01, exampleSentence_JPN_01, \
        exampleSentence_source_01, exampleSentence_URL_01, \
        exampleSentence02, exampleSentence_JPN_02, exampleSentence_source_02, \
        exampleSentence_URL_02, exampleSentence03, exampleSentence_JPN_03, \
        exampleSentence_source_03, exampleSentence_URL_03, exampleSentence04, \
        exampleSentence_JPN_04, exampleSentence_source_04, exampleSentence_URL_04, \
        wordRegisterMemo FROM public.table_word_register \
        WHERE mainWord = $1 AND userid = $2 and f_delete = false';

        var arrValues = [englishWord, '{' + req.user.id + '}'];

        var num = 0;
        try {
            const result = await pool.query(sql, arrValues);
            num = result.rowCount;
            if (num == 0) {
                res.render('no_view', { mainWord: englishWord, title: "単語", action: "/wordNoRegi" });
                return;
            }
            res.render('word', {
                items: result.rows,
                url: "/update_word_form/" + englishWord.replace(/'/g, "\\'"),
                crossContentPage: (result.rows)[0]["id"],
                dir: '/deleteWord'
            });
        } catch (err) {
            return console.error(err);
        }
    } else {
        res.redirect('/')
    }
});


router.post("/word/:englishWord", async function(req, res) {
    if (req.isAuthenticated()) {
        //https://blog.ch3cooh.jp/entry/nodejs/path_parser_on_express
        res.render('word', {
            url: "/word_register"
        });
    } else {
        res.redirect('/')
    }
});

router.post("/getWord_mean", async function(req, res) {
    if (req.isAuthenticated()) {

        //https://stackoverflow.com/questions/13119786/syntax-error-at-end-of-input-in-postgresql
        var sql = 'SELECT etymology_mean FROM public.table_etymology_register \
        WHERE f_delete = false and userid = $1 and etymology = $2';
        var arrValues = ['{' + req.user.id + '}', (req.body.etymology).trim()];

        var num = 0;
        const result = await pool.query(sql, arrValues, function(err, result, fields) {
            if (err) return console.error(err);

            // クロスオリジンを許可するなら以下の２行を利用
            res.header("Access-Control-Allow-Origin", "*")
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")

            num = result.rowCount;
            if (num > 0) {
                res.json(
                    (result.rows)[0]["etymology_mean"]
                )
                return;
            }

            res.json(
                ""
            )

        });
    } else {
        res.redirect('/')
    }
});

router.post("/deleteWord", async function(req, res) {
    if (req.isAuthenticated()) {
        const sql = 'UPDATE public.table_word_register SET f_delete = true WHERE id = $1 and userid = $2';
        const values = [Number(req.body.id), '{' + req.user.id + '}'];
        Synchronization_QueryRecord(sql, values);

        // クロスオリジンを許可するなら以下の２行を利用
        res.header("Access-Control-Allow-Origin", "*")
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")

        res.end()
    } else {
        res.redirect('/')
    }
});

router.post("/deleteEtymology", async function(req, res) {
    if (req.isAuthenticated()) {
        const sql = 'UPDATE public.table_etymology_register SET f_delete = true WHERE id = $1 and userid = $2';
        const values = [Number(req.body.id), '{' + req.user.id + '}'];
        Synchronization_QueryRecord(sql, values);

        // クロスオリジンを許可するなら以下の２行を利用
        res.header("Access-Control-Allow-Origin", "*")
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")

        res.end()
    } else {
        res.redirect('/')
    }
});

router.get("/word_register", async function(req, res) {
    if (req.isAuthenticated()) {

        //https://qiita.com/naru0504/items/06b687d6a174286756da
        //https://mebee.info/2021/09/19/post-24800/

        const sql = 'SELECT etymology FROM public.table_etymology_register WHERE f_delete = false and userid = $1 ORDER BY etymology';
        const values = ['{' + req.user.id + '}'];

        var num = 0;
        const result = await pool.query(sql, values, function(err, result, fields) {
            if (err) return console.error(err);
            res.render('word_register', {
                items: result.rows,
                ajaxUrl: "/getWord_mean"
            })
        });
    } else {
        res.redirect('/')
    }
});

router.post("/wordNoRegi", async function(req, res) {
    if (req.isAuthenticated()) {
        var var_mainWord = String(req.body.mainWord).trim();

        let sql = 'SELECT etymology FROM public.table_etymology_register WHERE f_delete = false and userid = $1 ORDER BY etymology';
        const values = ['{' + req.user.id + '}'];
        const result = await pool.query(sql, values, function(err, result, fields) {
            if (err) return console.error(err);
            res.render('word_register', {
                items: result.rows,
                mainWord: var_mainWord,
                action: "/word_register",
                ajaxUrl: "/getWord_mean"
            })
        });
    } else {
        res.redirect('/')
    }
});

router.post("/etymologyNoRegi", async function(req, res) {
    if (req.isAuthenticated()) {
        var var_etymology = String(req.body.mainWord).trim();
        res.render('etymology_register', {
            etymology: var_etymology,
            action: "/etymology_register"
        });
    } else {
        res.redirect('/')
    }
});

router.post("/word_register", async function(req, res) {
    if (req.isAuthenticated()) {
        if (req.body.mainWord.trim() != null) {


            //https://stackoverflow.com/questions/13119786/syntax-error-at-end-of-input-in-postgresql
            var sql = 'SELECT id FROM public.table_word_register WHERE mainword = $1 AND userid = $2 and f_delete = false';
            var arrValues = [(req.body.mainWord).trim(), '{' + req.user.id + '}'];
            var num = 0;

            const result = await pool.query(sql, arrValues, function(err, result, fields) {
                if (err) return console.error(err);
                num = result.rowCount;
                if (num > 0) {
                    res.render('already_register', {
                        mainWord: (req.body.mainWord).trim(),
                        title: "単語",
                        action: "/word_register"
                    });
                    return;
                }

                if (num == 0) {
                    const sqlInsert = 'INSERT \
                    INTO public.table_word_register( \
                    userid, mainWord, mean01, mean02, \
                    mean03, mean04, mean05, mean06, \
                    mean07, mean08, mean09, \
                    etymology01, etymology_mean01, \
                    etymology02, etymology_mean02, \
                    etymology03, etymology_mean03, \
                    relatedWord01, relatedWord02, relatedWord03, relatedWord04, relatedWord05, \
                    relatedWord06, relatedWord07, relatedWord08, relatedWord09, relatedWord10, \
                    relatedWord11, relatedWord12, \
                    exampleSentence01, exampleSentence_JPN_01, exampleSentence_source_01, \
                    exampleSentence_URL_01, exampleSentence02, exampleSentence_JPN_02, \
                    exampleSentence_source_02, exampleSentence_URL_02, exampleSentence03, \
                    exampleSentence_JPN_03, exampleSentence_source_03, exampleSentence_URL_03, \
                    exampleSentence04, exampleSentence_JPN_04, exampleSentence_source_04, \
                    exampleSentence_URL_04, wordRegisterMemo) VALUES (\
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, \
                    $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, \
                    $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, \
                    $39, $40, $41, $42, $43, $44, $45, $46)';

                    const values = ['{' + req.user.id + '}', (req.body.mainWord).trim(), req.body.mean01, req.body.mean02, req.body.mean03, req.body.mean04, req.body.mean05, req.body.mean06, req.body.mean07, req.body.mean08, req.body.mean09, req.body.etymology01.trim(), req.body.etymology_mean01.trim(), req.body.etymology02.trim(), req.body.etymology_mean02.trim(), req.body.etymology03.trim(), req.body.etymology_mean03.trim(), req.body.relatedWord01.trim(), req.body.relatedWord02.trim(), req.body.relatedWord03.trim(), req.body.relatedWord04.trim(), req.body.relatedWord05.trim(), req.body.relatedWord06.trim(), req.body.relatedWord07.trim(), req.body.relatedWord08.trim(), req.body.relatedWord09.trim(), req.body.relatedWord10.trim(), req.body.relatedWord11.trim(), req.body.relatedWord12.trim(), req.body.exampleSentence01.trim(), req.body.exampleSentence_JPN_01.trim(), req.body.exampleSentence_source_01.trim(), req.body.exampleSentence_URL_01.trim(), req.body.exampleSentence02.trim(), req.body.exampleSentence_JPN_02.trim(), req.body.exampleSentence_source_02.trim(), req.body.exampleSentence_URL_02.trim(), req.body.exampleSentence03.trim(), req.body.exampleSentence_JPN_03.trim(), req.body.exampleSentence_source_03.trim(), req.body.exampleSentence_URL_03.trim(), req.body.exampleSentence04.trim(), req.body.exampleSentence_JPN_04.trim(), req.body.exampleSentence_source_04.trim(), req.body.exampleSentence_URL_04.trim(), req.body.wordRegisterMemo];
                    Synchronization_QueryRecord(sqlInsert, values);

                    //そしてここに未登録の語源を登録する処理を追加する
                    InsertNotRegister('{' + req.user.id + '}', (req.body.etymology01).trim(), req.body.etymology_mean01.trim());
                    //そしてここに未登録の語源を登録する処理を追加する
                    InsertNotRegister('{' + req.user.id + '}', (req.body.etymology02).trim(), req.body.etymology_mean02.trim());
                    //そしてここに未登録の語源を登録する処理を追加する
                    InsertNotRegister('{' + req.user.id + '}', (req.body.etymology03).trim(), req.body.etymology_mean03.trim());

                    res.render('registerMessage', {
                        registerType: "単語",
                        word_or_etymology: (req.body.mainWord).trim(),
                        registerMovement: "登録",
                        contentPage: "/update_word_form/" + (req.body.mainWord).trim(),
                        etymology01: (req.body.etymology01).trim(),
                        etymology02: (req.body.etymology02).trim(),
                        etymology03: (req.body.etymology03).trim(),
                        ajaxUrl: "/getWord_mean"
                    });
                }
            });
        }

    } else {
        res.redirect('/')
    }
});

router.get("/etymology/:etymologyWord", async function(req, res) {
    if (req.isAuthenticated()) {
        const etymologyWord = String(req.params.etymologyWord);

        var sql = 'SELECT mainword FROM public.table_word_register \
        WHERE (etymology01 = $1 or etymology02 = $2 or etymology03 = $3) and userid = $4 and f_delete = false';

        var arrValues = [etymologyWord, etymologyWord, etymologyWord, '{' + req.user.id + '}'];
        let ety_result = null;

        try {
            const result = await pool.query(sql, arrValues);
            ety_result = result.rows;
        } catch (err) {
            return console.error(err);
        }

        sql = 'SELECT id, userid, etymology, etymology_mean, \
        etymology_relatedword01, etymology_relatedword02, \
        etymology_relatedword03, etymology_relatedword04, \
        etymology_relatedword05, etymology_relatedword06, \
        etymology_relatedword07, etymology_relatedword08, \
        etymology_relatedword08, etymology_relatedword09, \
        etymology_relatedword10, etymology_relatedword11, \
        etymology_relatedword12, etymology_memo FROM \
        public.table_etymology_register \
        WHERE f_delete = false and etymology = $1 AND userid = $2';

        arrValues = [etymologyWord, '{' + req.user.id + '}'];
        var num = 0;

        try {
            const result = await pool.query(sql, arrValues);
            num = result.rowCount;
            if (num == 0) {
                res.render('no_view', { mainWord: etymologyWord, title: "語源", action: "/etymologyNoRegi" });
                return;
            }
            res.render('etymology', {
                alreadyRegisterWords: ety_result,
                items: result.rows,
                url: "/update_etymology_form/" + etymologyWord.replace(/'/g, "\\'"),
                urlRelateWord: "/update_relateWord_form/" + String(etymologyWord),
                crossContentPage: (result.rows)[0]["id"],
                dir: '/deleteEtymology'
            });
        } catch (err) {
            return console.error(err);
        }
    } else {
        res.redirect('/')
    }
});


router.post("/etymology/:etymologyWord", async function(req, res) {
    if (req.isAuthenticated()) {
        //https://blog.ch3cooh.jp/entry/nodejs/path_parser_on_express
        res.render('word');
    } else {
        res.redirect('/')
    }
});



router.get("/update_etymology_form/:englishEtymology", async function(req, res) {
    if (req.isAuthenticated()) {
        const englishEtymology = req.params.englishEtymology;


        //https://stackoverflow.com/questions/13119786/syntax-error-at-end-of-input-in-postgresql
        var sql = 'SELECT id, userid, etymology, \
        etymology_mean, etymology_relatedword01, \
        etymology_relatedword02, etymology_relatedword03, \
        etymology_relatedword04, etymology_relatedword05, \
        etymology_relatedword06, etymology_relatedword07, \
        etymology_relatedword08, etymology_relatedword09, \
        etymology_relatedword10, etymology_relatedword11, \
        etymology_relatedword12, etymology_memo \
        FROM public.table_etymology_register \
        WHERE f_delete = false and userid = $1 and etymology = $2';

        var arrValues = ['{' + req.user.id + '}', englishEtymology];

        var num = 0;
        const result = await pool.query(sql, arrValues, function(err, result, fields) {
            if (err) return console.error(err);
            num = result.rowCount;
            if (num == 0) {
                res.render('no_view', { mainWord: englishEtymology, title: "語源", action: "/etymologyNoRegi" });
                return;
            }

            res.render('etymology_register', {
                action: "/updateEtymology",
                crossContentPage: "/update_etymology_form/" + englishEtymology,
                id: (result.rows)[0]["id"],
                original_etymology: (result.rows)[0]["etymology"],
                etymology: (result.rows)[0]["etymology"],
                etymology_mean: (result.rows)[0]["etymology_mean"],
                etymology_relatedWord01: (result.rows)[0]["etymology_relatedword01"],
                etymology_relatedWord02: (result.rows)[0]["etymology_relatedword02"],
                etymology_relatedWord03: (result.rows)[0]["etymology_relatedword03"],
                etymology_relatedWord04: (result.rows)[0]["etymology_relatedword04"],
                etymology_relatedWord05: (result.rows)[0]["etymology_relatedword05"],
                etymology_relatedWord06: (result.rows)[0]["etymology_relatedword06"],
                etymology_relatedWord07: (result.rows)[0]["etymology_relatedword07"],
                etymology_relatedWord08: (result.rows)[0]["etymology_relatedword08"],
                etymology_relatedWord09: (result.rows)[0]["etymology_relatedword09"],
                etymology_relatedWord10: (result.rows)[0]["etymology_relatedword10"],
                etymology_relatedWord11: (result.rows)[0]["etymology_relatedword11"],
                etymology_relatedWord12: (result.rows)[0]["etymology_relatedword12"],
                etymology_memo: (result.rows)[0]["etymology_memo"],
            });

        });

    } else {
        res.redirect('/')
    }
});

router.get("/update_relateWord_form/:englishEtymology", async function(req, res) {
    if (req.isAuthenticated()) {
        const englishEtymology = req.params.englishEtymology;

        //https://stackoverflow.com/questions/13119786/syntax-error-at-end-of-input-in-postgresql

        let sql = 'SELECT etymology FROM public.table_etymology_register WHERE f_delete = false and userid = $1 ORDER BY etymology';
        const values = ['{' + req.user.id + '}'];;
        let ety_result = null;

        const result = await pool.query(sql, values, function(err, result, fields) {
            if (err) return console.error(err);
            ety_result = result.rows;
        });

        sql = 'SELECT id, etymology, etymology_mean FROM public.table_etymology_register WHERE f_delete = false and userid = $1 and etymology = $2';

        var arrValues = ['{' + req.user.id + '}', englishEtymology];

        var num = 0;
        const resultSQL = await pool.query(sql, arrValues, function(err, result, fields) {
            if (err) return console.error(err);
            num = result.rowCount;
            if (num == 0) {
                res.render('no_view', { mainWord: englishEtymology, title: "語源", action: "/etymologyNoRegi" });
                return;
            }

            res.render('word_register', {
                action: "/word_register",
                items: ety_result,
                ajaxUrl: "/getWord_mean",
                etymology01: (result.rows)[0]["etymology"],
                etymology_mean01: (result.rows)[0]["etymology_mean"],
            });

        });

    } else {
        res.redirect('/')
    }
});

router.get("/update_word_form/:englishWord", async function(req, res) {
    if (req.isAuthenticated()) {

        const englishWord = String(req.params.englishWord);

        let sql = 'SELECT etymology FROM public.table_etymology_register WHERE f_delete = false and userid = $1 ORDER BY etymology';
        const values = ['{' + req.user.id + '}'];;
        let ety_result = null;

        const result = await pool.query(sql, values, function(err, result, fields) {
            if (err) return console.error(err);
            ety_result = result.rows;
        });

        //https://stackoverflow.com/questions/13119786/syntax-error-at-end-of-input-in-postgresql
        sql = 'SELECT id, userid, mainWord, mean01, mean02, \
        mean03, mean04, mean05, mean06, mean07, mean08, mean09, \
        etymology01, etymology_mean01, etymology02, etymology_mean02, \
        etymology03, etymology_mean03, relatedWord01, relatedWord02, \
        relatedWord03, relatedWord04, relatedWord05, relatedWord06, \
        relatedWord07, relatedWord08, relatedWord09, relatedWord10, \
        relatedWord11, relatedWord12, exampleSentence01, \
        exampleSentence_JPN_01, exampleSentence_source_01, \
        exampleSentence_URL_01, exampleSentence02, exampleSentence_JPN_02, \
        exampleSentence_source_02, exampleSentence_URL_02, \
        exampleSentence03, exampleSentence_JPN_03, exampleSentence_source_03, \
        exampleSentence_URL_03, exampleSentence04, exampleSentence_JPN_04, \
        exampleSentence_source_04, exampleSentence_URL_04, \
        wordRegisterMemo FROM public.table_word_register \
        WHERE mainWord = $1 AND userid = $2 and f_delete = false';

        var arrValues = [englishWord, '{' + req.user.id + '}'];

        var num = 0;
        const result2 = await pool.query(sql, arrValues, function(err, result, fields) {
            if (err) return console.error(err);
            num = result.rowCount;
            if (num == 0) {
                res.render('no_view', { mainWord: englishWord, title: "単語", action: "/wordNoRegi" });
                return;
            }

            res.render('word_register', {
                action: "/updateWord",
                items: ety_result,
                ajaxUrl: "../getWord_mean",
                crossContentPage: "/update_word_form/" + englishWord,
                id: (result.rows)[0]["id"],
                mainWord: (result.rows)[0]["mainword"],
                mean01: (result.rows)[0]["mean01"],
                mean02: (result.rows)[0]["mean02"],
                mean03: (result.rows)[0]["mean03"],
                mean04: (result.rows)[0]["mean04"],
                mean05: (result.rows)[0]["mean05"],
                mean06: (result.rows)[0]["mean06"],
                mean07: (result.rows)[0]["mean07"],
                mean08: (result.rows)[0]["mean08"],
                mean09: (result.rows)[0]["mean09"],
                etymology01: (result.rows)[0]["etymology01"],
                etymology_mean01: (result.rows)[0]["etymology_mean01"],
                etymology02: (result.rows)[0]["etymology02"],
                etymology_mean02: (result.rows)[0]["etymology_mean02"],
                etymology03: (result.rows)[0]["etymology03"],
                etymology_mean03: (result.rows)[0]["etymology_mean03"],
                relatedWord01: (result.rows)[0]["relatedword01"],
                relatedWord02: (result.rows)[0]["relatedword02"],
                relatedWord03: (result.rows)[0]["relatedword03"],
                relatedWord04: (result.rows)[0]["relatedword04"],
                relatedWord05: (result.rows)[0]["relatedword05"],
                relatedWord06: (result.rows)[0]["relatedword06"],
                relatedWord07: (result.rows)[0]["relatedword07"],
                relatedWord08: (result.rows)[0]["relatedword08"],
                relatedWord09: (result.rows)[0]["relatedword09"],
                relatedWord10: (result.rows)[0]["relatedword10"],
                relatedWord11: (result.rows)[0]["relatedword11"],
                relatedWord12: (result.rows)[0]["relatedword12"],
                exampleSentence01: (result.rows)[0]["examplesentence01"],
                exampleSentence_JPN_01: (result.rows)[0]["examplesentence_jpn_01"],
                exampleSentence_source_01: (result.rows)[0]["examplesentence_source_01"],
                exampleSentence_URL_01: (result.rows)[0]["examplesentence_url_01"],
                exampleSentence02: (result.rows)[0]["examplesentence02"],
                exampleSentence_JPN_02: (result.rows)[0]["examplesentence_jpn_02"],
                exampleSentence_source_02: (result.rows)[0]["examplesentence_source_02"],
                exampleSentence_URL_02: (result.rows)[0]["examplesentence_url_02"],
                exampleSentence03: (result.rows)[0]["examplesentence03"],
                exampleSentence_JPN_03: (result.rows)[0]["examplesentence_jpn_03"],
                exampleSentence_source_03: (result.rows)[0]["examplesentence_source_03"],
                exampleSentence_URL_03: (result.rows)[0]["examplesentence_url_03"],
                exampleSentence04: (result.rows)[0]["examplesentence04"],
                exampleSentence_JPN_04: (result.rows)[0]["examplesentence_jpn_04"],
                exampleSentence_source_04: (result.rows)[0]["examplesentence_source_04"],
                exampleSentence_URL_04: (result.rows)[0]["examplesentence_url_04"],
                wordRegisterMemo: (result.rows)[0]["wordregistermemo"]
            });

        });

    } else {
        res.redirect('/')
    }
});

router.post("/updateWord", function(req, res) {
    if (req.isAuthenticated()) {
        const sql = "UPDATE public.table_word_register SET \
        (\
            mainWord, mean01, mean02, \
            mean03, mean04, mean05, mean06, \
            mean07, mean08, mean09, \
            etymology01, etymology_mean01, \
            etymology02, etymology_mean02, \
            etymology03, etymology_mean03, \
            relatedWord01, relatedWord02, relatedWord03, relatedWord04, relatedWord05, \
            relatedWord06, relatedWord07, relatedWord08, relatedWord09, relatedWord10, \
            relatedWord11, relatedWord12, \
            exampleSentence01, exampleSentence_JPN_01, exampleSentence_source_01, \
            exampleSentence_URL_01, exampleSentence02, exampleSentence_JPN_02, \
            exampleSentence_source_02, exampleSentence_URL_02, exampleSentence03, \
            exampleSentence_JPN_03, exampleSentence_source_03, exampleSentence_URL_03, \
            exampleSentence04, exampleSentence_JPN_04, exampleSentence_source_04, \
            exampleSentence_URL_04, wordRegisterMemo\
        ) = (\
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, \
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, \
            $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, \
            $39, $40, $41, $42, $43, $44, $45\
        ) WHERE userid = $46 AND id = $47";

        const values = [(req.body.mainWord).trim(), req.body.mean01, req.body.mean02,
            req.body.mean03, req.body.mean04, req.body.mean05, req.body.mean06,
            req.body.mean07, req.body.mean08, req.body.mean09, req.body.etymology01.trim(),
            req.body.etymology_mean01, req.body.etymology02.trim(),
            req.body.etymology_mean02, req.body.etymology03.trim(),
            req.body.etymology_mean03, req.body.relatedWord01.trim(),
            req.body.relatedWord02.trim(), req.body.relatedWord03.trim(),
            req.body.relatedWord04.trim(), req.body.relatedWord05.trim(),
            req.body.relatedWord06.trim(), req.body.relatedWord07.trim(),
            req.body.relatedWord08.trim(), req.body.relatedWord09.trim(),
            req.body.relatedWord10.trim(), req.body.relatedWord11.trim(),
            req.body.relatedWord12.trim(), req.body.exampleSentence01.trim(),
            req.body.exampleSentence_JPN_01.trim(), req.body.exampleSentence_source_01.trim(),
            req.body.exampleSentence_URL_01.trim(), req.body.exampleSentence02.trim(),
            req.body.exampleSentence_JPN_02.trim(), req.body.exampleSentence_source_02.trim(),
            req.body.exampleSentence_URL_02.trim(), req.body.exampleSentence03.trim(),
            req.body.exampleSentence_JPN_03.trim(), req.body.exampleSentence_source_03.trim(),
            req.body.exampleSentence_URL_03.trim(), req.body.exampleSentence04.trim(),
            req.body.exampleSentence_JPN_04.trim(), req.body.exampleSentence_source_04.trim(),
            req.body.exampleSentence_URL_04.trim(), req.body.wordRegisterMemo,
            '{' + req.user.id + '}', req.body.id
        ];
        Synchronization_QueryRecord(sql, values);

        //そしてここに未登録の語源を登録する処理を追加する
        InsertNotRegister('{' + req.user.id + '}', (req.body.etymology01).trim(), req.body.etymology_mean01);
        //そしてここに未登録の語源を登録する処理を追加する
        InsertNotRegister('{' + req.user.id + '}', (req.body.etymology02).trim(), req.body.etymology_mean02);
        //そしてここに未登録の語源を登録する処理を追加する
        InsertNotRegister('{' + req.user.id + '}', (req.body.etymology03).trim(), req.body.etymology_mean03);

        res.render('registerMessage', {
            registerType: "単語",
            registerMovement: "更新",
            word_or_etymology: (req.body.mainWord).trim(),
            etymology01: (req.body.etymology01).trim(),
            etymology02: (req.body.etymology02).trim(),
            etymology03: (req.body.etymology03).trim(),
            contentPage: "/update_word_form/" + (req.body.mainWord).trim(),
            ajaxUrl: "/getWord_mean"
        });

    } else {
        res.redirect('/')
    }
});

router.post("/updateEtymology", async function(req, res) {
    if (req.isAuthenticated()) {
        var sql = "UPDATE public.table_etymology_register SET \
        (etymology, etymology_mean, etymology_relatedword01, \
            etymology_relatedword02, etymology_relatedword03, \
            etymology_relatedword04, etymology_relatedword05, \
            etymology_relatedword06, etymology_relatedword07, \
            etymology_relatedword08, etymology_relatedword09, \
            etymology_relatedword10, etymology_relatedword11, \
            etymology_relatedword12, etymology_memo) = (\
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, \
                $12, $13, $14, $15) \
                WHERE f_delete = false and userid = $16 and id = $17";

        var values = [(req.body.etymology).trim(), req.body.etymology_mean.trim(), req.body.etymology_relatedWord01.trim(), req.body.etymology_relatedWord02.trim(), req.body.etymology_relatedWord03.trim(), req.body.etymology_relatedWord04.trim(), req.body.etymology_relatedWord05.trim(), req.body.etymology_relatedWord06.trim(), req.body.etymology_relatedWord07.trim(), req.body.etymology_relatedWord08.trim(), req.body.etymology_relatedWord09.trim(), req.body.etymology_relatedWord10.trim(), req.body.etymology_relatedWord11.trim(), req.body.etymology_relatedWord12.trim(), req.body.etymology_memo.trim(), '{' + req.user.id + '}', req.body.id];
        Synchronization_QueryRecord(sql, values);

        sql = "UPDATE public.table_word_register SET etymology01 = $1, etymology_mean01 = $2 WHERE etymology01 = $3 and userid = $4 and f_delete = false";
        values = [(req.body.etymology).trim(), req.body.etymology_mean.trim(), req.body.original_etymology.trim(), '{' + req.user.id + '}'];
        QueryRecord(sql, values);

        sql = "UPDATE public.table_word_register SET etymology02 = $1, etymology_mean02 = $2 WHERE etymology02 = $3 and userid = $4 and f_delete = false";
        Synchronization_QueryRecord(sql, values);

        sql = "UPDATE public.table_word_register SET etymology03 = $1, etymology_mean03 = $2 WHERE etymology03 = $3 and userid = $4 and f_delete = false";
        Synchronization_QueryRecord(sql, values);

        res.render('registerMessage', {
            registerType: "語源",
            registerMovement: "更新",
            word_or_etymology: (req.body.etymology).trim(),
            contentPage: "/update_etymology_form/" + (req.body.etymology).trim()
        });

    } else {
        res.redirect('/')
    }
});

router.get("/etymology_register", async function(req, res) {
    if (req.isAuthenticated()) {
        res.render('etymology_register', {
            action: "/etymology_register",
            crossContentPage: "/etymology_register"

        });
    } else {
        res.redirect('/')
    }
});

router.post("/etymology_register", async function(req, res) {
    if (req.isAuthenticated()) {
        if (req.body.etymology.trim() != null) {

            //https://stackoverflow.com/questions/13119786/syntax-error-at-end-of-input-in-postgresql
            var sql = 'SELECT id FROM public.table_etymology_register WHERE f_delete = false and etymology = $1 AND userid = $2';
            var arrValues = [(req.body.etymology).trim(), '{' + req.user.id + '}'];
            var num = 0;

            const result = await pool.query(sql, arrValues, function(err, result, fields) {
                if (err) return console.error(err);
                num = result.rowCount;
                if (num > 0) {
                    res.render('already_register', {
                        mainWord: (req.body.etymology).trim(),
                        title: "語源",
                        action: "/etymology_register"
                    });
                    return;
                }

                if (num == 0) {
                    const sqlInsert = 'INSERT \
                            INTO public.table_etymology_register( \
                            userid, etymology, etymology_mean, etymology_relatedWord01, etymology_relatedWord02, etymology_relatedWord03, etymology_relatedWord04, etymology_relatedWord05, etymology_relatedWord06, etymology_relatedWord07, etymology_relatedWord08, etymology_relatedWord09, etymology_relatedWord10, etymology_relatedWord11, etymology_relatedWord12, etymology_memo) VALUES (\
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)';

                    const values = ['{' + req.user.id + '}', (req.body.etymology).trim(), req.body.etymology_mean.trim(), req.body.etymology_relatedWord01.trim(), req.body.etymology_relatedWord02.trim(), req.body.etymology_relatedWord03.trim(), req.body.etymology_relatedWord04.trim(), req.body.etymology_relatedWord05.trim(), req.body.etymology_relatedWord06.trim(), req.body.etymology_relatedWord07.trim(), req.body.etymology_relatedWord08.trim(), req.body.etymology_relatedWord09.trim(), req.body.etymology_relatedWord10.trim(), req.body.etymology_relatedWord11.trim(), req.body.etymology_relatedWord12.trim(), req.body.etymology_memo.trim()];
                    Synchronization_QueryRecord(sqlInsert, values);

                    res.render('registerMessage', {
                        registerType: "語源",
                        registerMovement: "登録",
                        word_or_etymology: (req.body.etymology).trim(),
                        contentPage: "/update_etymology_form/" + (req.body.etymology).trim()
                    });
                }
            });
        }

    } else {
        res.redirect('/')
    }
});

router.get('/change_mail', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('change_mail', {
            title: 'change_mail',
            message: res.locals.message,
            successMessage: res.locals.successmMessage
        })
    } else {
        res.redirect('/')
    }
})

router.get('/delete_account', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('delete_account')
    } else {
        res.redirect('/')
    }
})

router.post('/delete_account', (req, res) => {
    if (req.isAuthenticated()) {
        let usermail = req.body.mail;
        let mailconf = req.body.mailconf;

        if (!(regexMailCheck.test(usermail))) {
            req.flash('message', '!!!メールアドレスを入力してください!!!');
            res.redirect('/delete_account')
            return;
        }

        if (usermail != mailconf) {
            req.flash('message', '!!!パスワードとパスワード(確認用)が一致していません!!!');
            res.redirect('/delete_account')
            return;
        }


        //https://stackoverflow.com/questions/13119786/syntax-error-at-end-of-input-in-postgresql
        var sql = 'SELECT username FROM public.users WHERE emailverifiedat is not null AND username = $1 and f_delete = false';
        var arrValues = ['{' + req.user.id + '}'];
        var num = 0;

        pool.query(sql, arrValues, function(err, result, fields) {
            if (err) return console.error(err);
            num = result.rowCount;
            if (usermail != req.user.username) {
                req.flash('message', '!!!登録しているメールアドレスと違います!!!');
                res.redirect('/delete_account')
                return;
            }

            if (num == 0) {
                sql = 'UPDATE public.users SET username = null, f_delete = true WHERE id = $1';
                const values = ['{' + req.user.id + '}'];
                Synchronization_QueryRecord(sql, values);

                sql = 'UPDATE public.table_etymology_register SET f_delete = true WHERE userid = $1';
                Synchronization_QueryRecord(sql, values);

                sql = 'UPDATE public.table_word_register SET f_delete = true WHERE userid = $1';
                Synchronization_QueryRecord(sql, values);

                req.logout('{' + req.user.id + '}', err => {
                    if (err) return next(err);
                    req.flash('message', 'アカウント削除成功!!!')
                    res.redirect("/login");
                });
            }
        });
    } else {
        res.redirect('/')
    }
})

router.post('/change_mail', (req, res, next) => {
    if (req.isAuthenticated()) {
        let mailNow = req.body.mailNow;
        let newmail = req.body.newmail;
        let newmailconf = req.body.newmailconf;


        if (!(regexMailCheck.test(mailNow))) {
            req.flash('message', '!!!現在のメールアドレスにメールアドレスを入力してください!!!');
            res.redirect('/change_mail')
            return;
        }


        if (!(regexMailCheck.test(newmail))) {
            req.flash('message', '!!!変更用メールアドレスにメールアドレスを入力してください!!!');
            res.redirect('/change_mail')
            return;
        }


        if (!(regexMailCheck.test(newmailconf))) {
            req.flash('message', '!!!変更用メールアドレス(確認用)にメールアドレスを入力してください!!!');
            res.redirect('/change_mail')
            return;
        }

        if (newmail != newmailconf) {
            req.flash('message', '!!!メールアドレスとメールアドレス(確認用)が一致していません!!!');
            res.redirect('/change_mail')
            return;
        }

        if (mailNow != req.user.username) {
            req.flash('message', '!!!現在のメールアドレスを入力してください!!!');
            res.redirect('/change_mail')
            return;
        }

        next()
    } else {
        res.redirect('/')
    }
}, passport.authenticate('updateMail', {
    successRedirect: '/change_mail',
    failureRedirect: '/change_mail',
    failureFlash: true
}))

router.get('/change_pass', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('change_pass', {
            title: 'change_pass',
            message: res.locals.message,
            updateMessage: res.locals.updateMessage,
            successMessage: res.locals.successmMessage
        })
    } else {
        res.redirect('/')
    }
})

router.post('/change_pass', (req, res, next) => {
    if (req.isAuthenticated()) {
        let password = req.body.passwordNow;
        let newpass = req.body.newpass;
        let newpassconf = req.body.newpassconf;

        //var result = (newpass).match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,128}$/);
        var result = (newpass).match(regPassCheck);
        if (!(result)) {
            req.flash('message', '!!!半角英数字8文字以上100文字以下でお願いします!!!');
            res.redirect('/change_pass');
            return;
        }

        if (newpass != newpassconf) {
            req.flash('message', '!!!パスワードとパスワード(確認用)が一致していません!!!');
            res.redirect('/change_pass');
            return;
        }

        next()
    } else {
        res.redirect('/')
    }
}, passport.authenticate('updatePassword', {
    successRedirect: '/change_pass',
    failureRedirect: '/change_pass',
    failureFlash: true
}))

router.post('/change_pass', (req, res, next) => {
    if (req.isAuthenticated()) {
        let password = req.body.passwordNow;
        let newpass = req.body.newpass;
        let newpassconf = req.body.newpassconf;

        //var result = (newpass).match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,128}$/);
        var result = (newpass).match(regPassCheck);
        if (!(result)) {
            req.flash('message', '!!!半角英数字8文字以上100文字以下でお願いします!!!');
            res.redirect('/change_pass');
            return;
        }

        if (newpass != newpassconf) {
            req.flash('message', '!!!パスワードとパスワード(確認用)が一致していません!!!');
            res.redirect('/change_pass');
            return;
        }

        next()
    } else {
        res.redirect('/')
    }
}, passport.authenticate('updatePassword', {
    successRedirect: '/change_pass',
    failureRedirect: '/change_pass',
    failureFlash: true
}))

module.exports = router;