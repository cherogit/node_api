const DB_HOST = process.env.DB_HOST
const DB_PORT = process.env.DB_PORT
const DB_NAME = process.env.DB_NAME

const dbConfig = {
    url: `mongodb://${DB_HOST}:${DB_PORT}`,
    dbName: DB_NAME
}

const MongoClient = require('mongodb').MongoClient

let db = null

MongoClient.connect(
    dbConfig.url,
    {
        useUnifiedTopology: true
    },
    (err, database) => {
        if (err) {
            return console.log(err)
        } else {
            console.log(`connected to DB ${dbConfig.dbName}`)

            db = database.db(dbConfig.dbName)
        }
    }
)

exports.getDb = () => db