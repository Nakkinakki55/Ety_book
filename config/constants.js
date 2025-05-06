require('dotenv').config();

const PGHOST = process.env.PGHOST;
const PGPORT = process.env.PGPORT;
const PGDATABASE = process.env.PGDATABASE;
const PGUSER = process.env.PGUSER;
const PGPASSWORD = process.env.PGPASSWORD;
const KEYAUTOLOGIN = process.env.KEYAUTOLOGIN;
const TOKEN_SECRET_KEY = process.env.TOKEN_SECRET_KEY;
const JWTSECRETKEY = process.env.JWTSECRETKEY;
const INQUIRY_EMAIL = process.env.INQUIRY_EMAIL;
const SERVER_PORT = process.env.SERVER_PORT;
const MAIL_HOST = process.env.MAIL_HOST;
const MAIL_PORT = process.env.MAIL_PORT;
const MAIL_USER = process.env.MAIL_USER;
const MAIL_SECURE = process.env.MAIL_SECURE;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

module.exports = { PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD, KEYAUTOLOGIN, TOKEN_SECRET_KEY, JWTSECRETKEY, SERVER_PORT, INQUIRY_EMAIL, MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_SECURE, GMAIL_APP_PASSWORD };