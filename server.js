Error.stackTraceLimit = Infinity

const express = require('express')
const formidableMiddleware = require('express-formidable')
const path = require('path')
const MongoClient = require('mongodb').MongoClient
const bodyParser = require('body-parser')
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

app.set(`view engine`, `pug`);
app.set(`views`, `./app/views`)

app.use(function (err, req, res, next) {
    console.error(err)
    res.status(500).send('Something broke!')
})
app.use(formidableMiddleware())
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(path.join(__dirname, '/public')))

app.use((req, res, next) => {
    // if (Math.random() > 0.5) next()
    next()
})

app.get('/', async (req, res) => {
    try {
        res.render('index', {
            title: 'Home',
            isIndex: true,
            message: 'Home Page'
        })
    } catch (err) {
        console.log(err);
    }
})

app.get('/notes', async (req, res) => {
    try {
        const dbNotes = await db.collection(`test`).find({}).toArray()

        res.render('notes', {
            title: 'notes list',
            isNotes: true,
            message: 'Notes Page',
            notes: dbNotes
        })
    } catch (err) {
        console.log(err);
        res.redirect('/')
    }
})

app.get('/update/:id', async (req, res) => {
    try {
        const id = req.params.id
        const note = await db.collection(`test`).findOne({id: id})

        if (note) {
            res.render('update-note', {
                title: 'update-note',
                isUpdate: true,
                message: `update Note "${note.note}"`,
                note: await db.collection(`test`).findOne({id: id})
            })
        } else {
            res.send(`note with id ${id} is not found`)
        }

    } catch {
        console.error(err)
        res.redirect('/')
    }
})

app.get('/note', async (req, res) => {
    try {
        res.render('create-note', {
            title: 'create-note',
            isCreate: true,
            message: 'Create Note Page'
        })
    } catch (err) {
        console.log(err)
    }
})

// app.get('/search/:text?', async (req, res) => {
//     console.log(req.query.text === 'mogo')
//     console.log(req.params.text === 'mogo')
//
//     res.send({query: req.query, params: req.params})
// })

app.get('/note/:id', async (req, res) => {
    try {
        const id = req.params.id

        if (!id) {
            throw new Error('not id')
        } else {
            const note = await db.collection(`test`).findOne({id: id})

            if (note) {
                res.render('note', {
                    title: 'note',
                    isNote: true,
                    message: `Note is "${note.note}"`,
                    note: await db.collection(`test`).findOne({id: id})
                })
            } else {
                res.send(`note with id ${id} is not found`)
            }
        }

    } catch (err) {
        console.error(err);
        throw err
    }
})

app.post('/note', async (req, res) => {
    try {
        console.log(req.body)
        const id = req.body.id

        if (!id) {
            throw new Error('not id')
        }

        const existingNote = await db.collection(`test`).findOne({id: id})

        if (existingNote) {
            throw new Error('Уже существует.')
        }

        const result = await db.collection(`test`).insertOne(req.body)

        res.render('note', {
            title: 'note',
            isCreate: true,
            message: 'Вы создали заметку, поздравляем!',
            isResult: true,
            successMessage: `you added note# ${req.body.id} Yoohoo`,
            note: result.ops[0]
        })
    } catch (err) {
        console.error(err)
        res.redirect('/note')
    }
})

app.put('/update/:id', async (req, res) => {
    try {
        const currentId = req.fields.currentId
        const id = req.fields.id
        const note = req.fields.note

        await db.collection(`test`).updateOne({id: currentId}, {$set: {id: id, note: note}})

        res.redirect(303, '/')

    } catch (err) {
        console.log(err);
        res.redirect('/')
    }
})

app.delete('/note/:id', async (req, res) => {
    const id = req.params.id
    const note = await db.collection(`test`).findOne({id: id})

    await db.collection(`test`).remove({id})

    res.render('note', {
        title: 'note',
        isNote: true,
        message: 'Note Page',
        deleted: true,
        note: note
    })
})

app.listen(8000, `0.0.0.0`, () => {
    console.log('We are live on ' + 8000);
});