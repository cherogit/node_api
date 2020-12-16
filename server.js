Error.stackTraceLimit = Infinity

const Koa = require('koa')
const Router = require('koa-router')
const serve = require('koa-static')
const views = require('koa-views')
const path = require('path')
const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectID
const bodyParser = require('koa-bodyparser')
const multer = require('koa-multer')
const dbConfig = require('./config/db')
let db = null

const validators = require('./schemes')

const checkers = {
    objectIdIsValid(id) {
        return ObjectId.isValid(id)
    }
}


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
        const status = ctx.status || 404
        if (status === 404) {
            ctx.throw(404)
        }
    } catch (err) {
        console.error('err:', err.errors)
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
})

router.get('/', async ctx => {

    await ctx.render('index', {
        title: 'Home',
        isIndex: true,
        message: 'Home Page'
    })
})

router.get('/notes', async ctx => {

    const dbNotes = await db.collection(`test`).find({}).toArray()

    await ctx.render('notes', {
        title: 'notes list',
        isNotes: true,
        message: 'Notes Page',
        notes: dbNotes
    })
})

router.get('/note', async ctx => {
    await ctx.render('create-note', {
        title: 'create-note',
        isCreate: true,
        message: 'Create Note Page'
    })
})

router.get('/note/:id', async ctx => {
    const id = ctx.params.id

    if (!checkers.objectIdIsValid(id)) ctx.throw(400, `id is not valid`)

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

        ctx.throw(400, `note with id ${id} is not found`)
    }
})

router.get('/update/:id', async ctx => {
    const id = ctx.params.id

    if (!checkers.objectIdIsValid(id)) ctx.throw(400, `id is not valid`)

    const note = await db.collection(`test`).findOne({'_id': ObjectId(id)})

    if (note) {
        await ctx.render('update-note', {
            title: 'update-note',
            message: `update Note "${note.note}"`,
            note: note
        })
    } else {
        ctx.throw(404, `note with id ${id} is not found`)
    }
})

router.post('/note', async ctx => {
    const resultValidation = await validators.noteValidator(ctx.request.body)

    if (!resultValidation) console.error(validators.noteValidator.errors)

    const {title, note} = ctx.request.body
    const existingNote = await db.collection(`test`).findOne({title: title})

    if (existingNote) {
        ctx.throw(409, `заметка с таким заголовком уже существует.`)
    }

    const result = await db.collection(`test`).insertOne(ctx.request.body)

    await ctx.render('note', {
        title: 'note',
        isCreate: true,
        message: 'Вы создали заметку, поздравляем!',
        note: result.ops[0]
    })
})

router.put('/update/:id', upload.none(), async ctx => {
    const resultValidation = await validators.noteValidator(ctx.request.body)

    if (!resultValidation) console.log(validators.noteValidator.errors)

    const id = ctx.req.body.id
    const title = ctx.req.body.title
    const note = ctx.req.body.note

    await db.collection(`test`).updateOne({'_id': ObjectId(id)}, {$set: {title: title, note: note}})
})

router.delete('/note/:id', async ctx => {
    const id = ctx.params.id

    if (!checkers.objectIdIsValid(id)) ctx.throw(400, `id is not valid`)

    const note = await db.collection(`test`).findOne({id: id})

    await db.collection(`test`).deleteOne({'_id': ObjectId(id)})
})

app.use(router.routes())

app.listen(8000, `0.0.0.0`, () => {
    console.log('Listen with Koa ' + 8000)
})