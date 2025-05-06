const nodemailer = require("nodemailer");
const constants = require("./constants");

//参考文献
//https://work.omori.io/posts/how-to-get-gmail-app-password/
//https://npmmirror.com/package/uuid/v/1.4.1
exports.SendMail = function(argEmail, argFromEmail, argSubject, argMainText) {
    const transporter = nodemailer.createTransport({
        host: constants.MAIL_HOST,
        port: constants.MAIL_PORT,
        secure: constants.MAIL_SECURE,
        auth: {
            user: constants.MAIL_USER,
            pass: constants.GMAIL_APP_PASSWORD,
        },
    });

    const mailOptions = {
        from: `${argFromEmail} <${constants.MAIL_USER}>`,
        to: argEmail,
        subject: argSubject,
        text: argMainText,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("メール送信エラー:", error);
        } else {
            console.log("メール送信成功:", info.response);
        }
    });
};