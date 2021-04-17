const ObjectId = require('mongodb').ObjectID
const {router, upload} = require('./router')
const {getDb} = require('../db')

const {PERMISSIONS} = require('../constants')

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
    //// нужно вынести в функцию (ctx, PERMISSIONS.updateNote, errorMessage (внутри зашить))

    const db = getDb()
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

router.post('/note', async (ctx) => {
    const db = getDb()
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

router.put('/update/:id', upload.none(), async (ctx) => {
    const db = getDb()
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

router.delete('/note/:id', async (ctx) => {
    const db = getDb()
    const id = ctx.params.id

    if (!checkers.objectIdIsValid(id)) ctx.throw(400, `id is not valid`)

    const note = await db.collection(`test`).findOne({id: id})

    await db.collection(`test`).deleteOne({_id: ObjectId(id)})
})
