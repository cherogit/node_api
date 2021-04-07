const Koa = require('koa')
const Router = require('koa-router')
const ObjectId = require('mongodb').ObjectID
const multer = require('@koa/multer')

const {PERMISSIONS} = require('../constants')

const validators = require('../utils/schemes')

const checkers = {
    objectIdIsValid(id) {
        return ObjectId.isValid(id)
    }
}

const app = new Koa()

notesRouter = new Router()

// app.use('/test', notesRouter)

const upload = multer()

notesRouter.get('/notes', async (ctx) => {
    const dbNotes = await db.collection(`test`).find({}).toArray()

    await ctx.render('notes', {
        title: 'notes list',
        isNotes: true,
        message: 'Notes Page',
        notes: dbNotes
    })
})

notesRouter.get('/note', async (ctx) => {
    await ctx.render('create-note', {
        title: 'create-note',
        isCreate: true,
        message: 'Create Note Page'
    })
})

notesRouter.get('/note/:id', async (ctx) => {
    const id = ctx.params.id

    if (!checkers.objectIdIsValid(id)) ctx.throw(400, `id is not valid`)

    const note = await db.collection(`test`).findOne({_id: ObjectId(id)})

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

notesRouter.get('/update/:id', async (ctx) => {
    //// нужно вынести в функцию (ctx, PERMISSIONS.updateNote, errorMessage (внутри зашить))

    const userRoles = await db.collection('roles').find({key: {$in: ctx.user.roles}}).toArray()
    const userPermissions = userRoles.reduce((acc, cur) => {
        return [...acc, ...cur.permissions]
    }, [])
    const uniqueUserPermissions = [...new Set(userPermissions)]

    console.log('uniqueUserPermissions', uniqueUserPermissions)

    if (!uniqueUserPermissions.length > 0 || !uniqueUserPermissions.includes(PERMISSIONS.updateNote)) ctx.throw(403, 'permission denied (you cannot modify the note)')
    //// нужно вынести в функцию

    const id = ctx.params.id

    if (!checkers.objectIdIsValid(id)) ctx.throw(400, `id is not valid`)

    const note = await db.collection(`test`).findOne({_id: ObjectId(id)})

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

notesRouter.post('/note', async (ctx) => {
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

notesRouter.put('/update/:id', upload.none(), async (ctx) => {
    console.log(123, checkers.objectIdIsValid(ctx.params.id))
    await validators.noteValidator(ctx.request.body)

    const resultValidation = await validators.noteValidator(ctx.request.body)

    if (!resultValidation) console.error(validators.noteValidator.errors)

    console.log('put', ctx.params)

    const {id, title, note} = ctx.request.body

    console.log('id', id)
    console.log('title', title)
    console.log('note', note)

    await db
        .collection(`test`)
        .updateOne({_id: ObjectId(id)}, {$set: {title: title, note: note}})
})

notesRouter.delete('/note/:id', async (ctx) => {
    const id = ctx.params.id

    if (!checkers.objectIdIsValid(id)) ctx.throw(400, `id is not valid`)

    const note = await db.collection(`test`).findOne({id: id})

    await db.collection(`test`).deleteOne({_id: ObjectId(id)})
})

app.use(notesRouter.routes())