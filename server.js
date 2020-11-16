Error.stackTraceLimit = Infinity

const Koa = require('koa')
const Router = require('koa-router')
const serve = require('koa-static')
const views = require('koa-views')
const formidableMiddleware = require('koa-formidable')
const path = require('path')
const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectID
const bodyParser = require('koa-bodyparser')
const multer = require('koa-multer')
const dbConfig = require('./config/db')
let db = null

MongoClient.connect(dbConfig.url, {
    useUnifiedTopology: true
}, (err, database) => {
    if (err) {
        return console.log(err)
    } else {
        console.log(`connected to DB {koajs}`)
        db = database.db(dbConfig.dbName)
    }
})

const app = new Koa()
const router = new Router()
const upload = multer()

app.use(bodyParser())

app.use(serve(path.join(__dirname, '/public')))
app.use(views(path.join(__dirname, '/app/views'), {extension: 'pug'}))

app.use(async (ctx, next) => {
    try {
        await next()
    } catch (err) {
        ctx.status = err.status || 500
        // ctx.body = err.message

        await ctx.render('error', {
            title: `Ошибка ${ctx.status}`,
            message: err.message
        })
    }
})

app.on('error', (err, ctx) => {
    console.error('server error', err)
    /* centralized error handling:
     *   console.log error
     *   write error to log file
     *   save error and request information to database if ctx.request match condition
     *   ...
    */
})

router
    .get('/', async ctx => {

        await ctx.render('index', {
            title: 'Home',
            isIndex: true,
            message: 'Home Page'
        })
    })

    .get('/notes', async ctx => {

        const dbNotes = await db.collection(`test`).find({}).toArray()

        await ctx.render('notes', {
            title: 'notes list',
            isNotes: true,
            message: 'Notes Page',
            notes: dbNotes
        })
    })

    .get('/note', async ctx => {
        await ctx.render('create-note', {
            title: 'create-note',
            isCreate: true,
            message: 'Create Note Page'
        })
    })

    .get('/note/:id', async ctx => {
        const id = ctx.params.id

        if (!id) {
            // throw new Error('not id')
            throw new Error('Error Message')
        } else {
            const note = await db.collection(`test`).findOne({'_id': ObjectId(id)})

            if (note) {
                await ctx.render('note', {
                    title: 'note',
                    isNote: true,
                    message: `Note is "${note.note}"`,
                    note: note
                })
            } else {
                // let err = new Error('Page Not Found')
                // err.statusCode = 404
                // err.message = `note with id ${id} is not found`
                // throw err

                // ctx.throw(400, `note with id ${id} is not found`)
                throw new Error(`note with id ${id} is not found`)
            }
        }
    })

    .get('/update/:id', async ctx => {
        const id = ctx.params.id
        const note = await db.collection(`test`).findOne({'_id': ObjectId(id)})

        if (note) {
            await ctx.render('update-note', {
                title: 'update-note',
                message: `update Note "${note.note}"`,
                note: note
            })
        } else {
            ctx.body = `note with id ${id} is not found`
        }
    })

    .post('/note', async ctx => {
        const title = ctx.request.body.title

        if (!title) {
            throw new Error('not title')
        }

        const existingNote = await db.collection(`test`).findOne({title: title})

        if (existingNote) {
            throw new Error('заметка с таким заголовком уже существует.')
        }

        const result = await db.collection(`test`).insertOne(ctx.request.body)

        await ctx.render('note', {
            title: 'note',
            isCreate: true,
            message: 'Вы создали заметку, поздравляем!',
            note: result.ops[0]
        })
    })

    .put('/update/:id', upload.none(), async ctx => {
        const id = ctx.req.body.id
        const title = ctx.req.body.title
        const note = ctx.req.body.note

        await db.collection(`test`).updateOne({'_id': ObjectId(id)}, {$set: {title: title, note: note}})
    })

    .delete('/note/:id', async ctx => {
        const id = ctx.params.id
        const note = await db.collection(`test`).findOne({id: id})

        await db.collection(`test`).deleteOne({'_id': ObjectId(id)})
    })

app.use(router.routes())

app.listen(8000, `0.0.0.0`, () => {
    console.log('Listen with Koa ' + 8000)
})