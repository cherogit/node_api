Error.stackTraceLimit = Infinity

const express = require('express')
const formidableMiddleware = require('express-formidable')
const path = require('path')
const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectID
const bodyParser = require('body-parser') //koa-body-parser
const dbConfig = require('./config/db')
let db = null

MongoClient.connect(dbConfig.url, {
    useUnifiedTopology: true
}, (err, database) => {
    if (err) {
        return console.log(err)
    } else {
        console.log(`connected to DB`)
        db = database.db(dbConfig.dbName)
    }
})

const app = express();

app.set(`view engine`, `pug`)
app.set(`views`, `./app/views`)

app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(path.join(__dirname, '/public')))

app.get('/', async (req, res) => {

    res.render('index', {
        title: 'Home',
        isIndex: true,
        message: 'Home Page'
    })
})

app.get('/notes', async (req, res) => {

    const dbNotes = await db.collection(`test`).find({}).toArray()

    res.render('notes', {
        title: 'notes list',
        isNotes: true,
        message: 'Notes Page',
        notes: dbNotes
    })
})

app.get('/update/:id', async (req, res) => {
    const id = req.params.id
    const note = await db.collection(`test`).findOne({'_id': ObjectId(id)})

    if (note) {
        res.render('update-note', {
            title: 'update-note',
            message: `update Note "${note.note}"`,
            note: note
        })
    } else {
        res.send(`note with id ${id} is not found`)
    }
})

app.get('/note', async (req, res) => {
    res.render('create-note', {
        title: 'create-note',
        isCreate: true,
        message: 'Create Note Page'
    })
})

// app.get('/search/:text?', async (req, res) => {
//     console.log(req.query.text === 'mogo')
//     console.log(req.params.text === 'mogo')
//
//     res.send({query: req.query, params: req.params})
// })

app.get('/note/:id', async (req, res) => {
    const id = req.params.id

    if (!id) {
        throw new Error('not id')
    } else {
        const note = await db.collection(`test`).findOne({'_id': ObjectId(id)})

        if (note) {
            res.render('note', {
                title: 'note',
                isNote: true,
                message: `Note is "${note.note}"`,
                note: note
            })
        } else {
            let err = new Error('Page Not Found')
            err.statusCode = 404
            err.message = `note with id ${id} is not found`
            throw err
        }
    }
})

app.post('/note', async (req, res) => {
    const title = req.body.title

    if (!title) {
        throw new Error('not title')
    }

    const existingNote = await db.collection(`test`).findOne({title: title})

    if (existingNote) {
        throw new Error('заметка с таким заголовком уже существует.')
    }

    const result = await db.collection(`test`).insertOne(req.body)

    res.render('note', {
        title: 'note',
        isCreate: true,
        message: 'Вы создали заметку, поздравляем!',
        note: result.ops[0]
    })
})

app.put('/update/:id', formidableMiddleware(), async (req, res) => {
    const id = req.fields.id
    const title = req.fields.title
    const note = req.fields.note

    await db.collection(`test`).updateOne({'_id': ObjectId(id)}, {$set: {title: title, note: note}})

    res.redirect(303, '/')
})

app.delete('/note/:id', async (req, res) => {
    const id = req.params.id
    const note = await db.collection(`test`).findOne({id: id})

    await db.collection(`test`).deleteOne({'_id': ObjectId(id)})
})

app.get('*', function(req, res) {
    let err = new Error('Page Not Found')
    err.statusCode = 404
    throw err
});

app.use((err, req, res, next) => {
    console.error(err, req.method, req.path)
    if (!err.statusCode) err.statusCode = 500

    res.status(err.statusCode).render('error', {
        title: `Код ошибки: ${err.statusCode}`,
        message: err.message
    })

    next()
})


app.listen(8000, `0.0.0.0`, () => {
    console.log('We are live on ' + 8000);
})