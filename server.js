Error.stackTraceLimit = Infinity
const express = require('express');
const path = require('path');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const dbConfig = require('./config/db');
const app = express();
const NOTES = []
let db = null

app.set(`view engine`, `pug`);
app.set(`views`, `./app/views`)

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, '/public')));

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

app.get('/', async (req, res) => {
    try {
        // res.sendFile(path.join(__dirname+'/app/views/index2.html'))
        res.render('index', {
            title: 'Home',
            isIndex: true,
            message: 'Home Page'
        })

        console.log(await db.collection(`test`).find({}).toArray())
        // NOTES.push(await db.collection(`test`).find({}).toArray())
    } catch (err) {
        console.log(err);
    }
})

app.get('/notes', async (req, res) => {
    try {
        // res.sendFile(path.join(__dirname+'/app/views/note.html'))
        console.log('notes', NOTES)

        const dbNotes = await db.collection(`test`).find({}).toArray()

        res.render('notes', {
            title: 'notes list',
            isNotes: true,
            message: 'Notes Page',
            notes: dbNotes
        })
    } catch (err) {
        console.log(err);
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
        console.log(req.params)
        const id = req.params.id

        if (!id) {
            res.send(`your notes are ${JSON.stringify(NOTES)}`)
        } else {
            const note = await db.collection(`test`).findOne({id: id})
            console.log(note)
            // const note = NOTES.find((item) => item.id === id)

            if (note) {
                // res.send(`your note is ${note.note}`)
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
        console.log(err);
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
        console.log(result)

        // const note = await db.collection(`test`).findOne({id: id})

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

// app.put('/note/:id', async (req, res) => {
//     try {
//         console.log(req.body)
//
//         NOTES.push(req.body)
//         res.send(`you added note# ${req.body.id}`)
//     } catch (err) {
//         console.log(err);
//     }
// })
//
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