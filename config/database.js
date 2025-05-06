const { Pool } = require('pg')
const constants = require('./constants');


const pool = new Pool({
    user: constants.PGUSER,
    host: constants.PGHOST,
    database: constants.PGDATABASE,
    password: constants.PGPASSWORD,
    port: constants.PGPORT,
    //ssl: false
    //ssl: true
    ssl: { rejectUnauthorized: false }
})

module.exports = pool;