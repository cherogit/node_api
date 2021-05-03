const ObjectId = require('mongodb').ObjectID
const {router, upload} = require('./router')
const {getDb} = require('../db')

const {PERMISSIONS} = require('../constants')

const {checkUserAccessRights} = require('../utils/permissions')

const validators = require('../utils/schemes')

const checkers = {
    objectIdIsValid(id) {
        return ObjectId.isValid(id)
    }
}

router.get('/notes', async (ctx) => {
    const db = getDb()
    const dbNotes = await db.collection(`test`).find({}).toArray()

    await ctx.render('notes', {
        title: 'notes list',
        isNotes: true,
        message: 'Notes Page',
        notes: dbNotes
    })
})

router.get('/note', async (ctx) => {
    await ctx.render('create-note', {
        title: 'create-note',
        isCreate: true,
        message: 'Create Note Page'
    })
})

router.get('/note/:id', async (ctx) => {
    const db = getDb()
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

router.get('/update/:id', async (ctx) => {
    const db = getDb()

    await checkUserAccessRights(ctx, db, PERMISSIONS.updateNote)

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

router.post('/note', async (ctx) => {
    const db = getDb()
    const resultValidation = await validators.noteValidator(ctx.request.body)

    if (!resultValidation) console.error(validators.noteValidator.errors)

    const {title, labels} = ctx.request.body
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

router.put('/update/:id', upload.none(), async (ctx) => {
    const db = getDb()

    await validators.noteValidator(ctx.request.body)

    const resultValidation = await validators.noteValidator(ctx.request.body)

    if (!resultValidation) console.error(validators.noteValidator.errors)

    const {id, title, note, labels, publication_date} = ctx.request.body

    await db
        .collection(`test`)
        .updateOne({_id: ObjectId(id)}, {
            $set: {
                title: title,
                note: note,
                labels: labels,
                publication_date: publication_date
            }
        })

    ctx.body = {id}
})

router.delete('/note/:id', async (ctx) => {
    const db = getDb()
    const id = ctx.params.id

    if (!checkers.objectIdIsValid(id)) ctx.throw(400, `id is not valid`)

    const note = await db.collection(`test`).findOne({id: id})

    await db.collection(`test`).deleteOne({_id: ObjectId(id)})

    ctx.body = {id}
})
