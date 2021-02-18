Error.stackTraceLimit = Infinity;

const Koa = require("koa");
const Router = require("koa-router");
const serve = require("koa-static");
const views = require("koa-views");
const path = require("path");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
const bodyParser = require("koa-bodyparser");
const multer = require("koa-multer");
const dbConfig = require("./config/db");
let db = null;

const {COOKIE_NAME, PWD_SALT} = require('./constants')

///////////////////////////////////////////////////////////////// TODO

const crypto = require("crypto")
const util = require("util")
const pbkdf2 = util.promisify(crypto.pbkdf2)
const hashPassword = async (password) => {
    return (await pbkdf2(password, PWD_SALT, 100000, 64, "sha512")).toString(
        "hex"
    )
}
/////////////////////////////////////////////////////////////////

const validators = require("./schemes")

const checkers = {
    objectIdIsValid(id) {
        return ObjectId.isValid(id)
    }
}

MongoClient.connect(
    dbConfig.url,
    {
        useUnifiedTopology: true,
    },
    (err, database) => {
        if (err) {
            return console.log(err);
        } else {
            console.log(`connected to DB ${dbConfig.dbName}`);
            db = database.db(dbConfig.dbName);
        }
    }
);

const app = new Koa();
const router = new Router();
const upload = multer();

app.use(bodyParser());

app.use(serve(path.join(__dirname, "/public")));
app.use(views(path.join(__dirname, "/app/views"), {extension: "pug"}));

app.use(async (ctx, next) => {
    try {
        await next();
        const status = ctx.status || 404;
        if (status === 404) {
            ctx.throw(404);
        }
    } catch (err) {
        if (err.errors) {
            console.error("validation errors:", err.errors);
        } else {
            console.error(err);
        }

        ctx.status = err.status || 500;

        await ctx.render("error", {
            title: `Ошибка ${ctx.status}`,
            message: err.message,
        });
    }
});

app.on("error", (err, ctx) => {
    console.error("server error", err);
});

router.get("/registration", async (ctx) => {
    await ctx.render("registration", {
        title: "Registration",
        message: "welcome",
    });
});

router.post("/registration", async (ctx) => {
    const {login, userName, password} = ctx.request.body;

    const existingLogin = await db.collection(`users`).findOne({login});

    if (existingLogin) {
        ctx.throw(409, `User с таким login уже существует.`);
    }

    const hashedPassword = await hashPassword(password);

    await db.collection(`users`).insertOne({login, userName, hashedPassword, cookies: {}});

    await ctx.render("registration", {
        title: "Registration",
        message: `Welcome, ${userName}`,
    });
});

router.get("/auth", async (ctx) => {
    await ctx.render("auth", {
        title: "Authorization",
        message: "Sign in",
    });
});

app.use(async (ctx, next) => {
    const cookieValue = ctx.cookies.get(COOKIE_NAME);

    ctx.user = await db.collection("users").findOne(
        {
            "cookies.name": COOKIE_NAME,
            "cookies.value": cookieValue,
        },
        {
            projection: {
                hashedPassword: 0,
                cookies: 0,
            },
        }
    );

    if (!["/auth", '/registration'].includes(ctx.path)) {
        if (!ctx.user) ctx.throw(403, "You are not logged in, please log in");
    }

    await next();
});

router.post("/auth", async (ctx) => {
    const {login, password} = ctx.request.body;

    const user = await db.collection(`users`).findOne({login: login});
    if (!user) ctx.throw(403, "User is not defined");

    const hashedPassword = await hashPassword(password);
    if (hashedPassword !== user.hashedPassword) {
        ctx.throw(403, "Неверный пароль");
    }

    const cookie = {
        name: COOKIE_NAME,
        value: Math.random().toString().slice(2),
        expires: new Date(Date.now() + 1000 * 86400 * 365),
    };

    await db
        .collection(`users`)
        .updateOne({login: login}, {$set: {cookies: cookie}});

    ctx.cookies.set(cookie.name, cookie.value, {
        expires: cookie.expires,
        httpOnly: true,
    });

    ctx.redirect("/");
});

router.get("/logout", async (ctx) => {
    if (!ctx.user) return ctx.redirect("/");

    const cookieValue = ctx.cookies.get(COOKIE_NAME);

    await db
        .collection("users")
        .updateOne(
            {_id: ObjectId(ctx.user._id)},
            {$set: {cookies: {}}}
        );

    ctx.cookies.set(COOKIE_NAME)

    ctx.redirect('/')
});

router.get("/", async (ctx) => {
    await ctx.render("index", {
        title: "Home",
        isIndex: true,
        message: "Home Page",
    });
});

router.get("/notes", async (ctx) => {
    const dbNotes = await db.collection(`test`).find({}).toArray();

    await ctx.render("notes", {
        title: "notes list",
        isNotes: true,
        message: "Notes Page",
        notes: dbNotes,
    });
});

router.get("/note", async (ctx) => {
    await ctx.render("create-note", {
        title: "create-note",
        isCreate: true,
        message: "Create Note Page",
    });
});

router.get("/note/:id", async (ctx) => {
    const id = ctx.params.id;

    if (!checkers.objectIdIsValid(id)) ctx.throw(400, `id is not valid`);

    const note = await db.collection(`test`).findOne({_id: ObjectId(id)});

    if (note) {
        await ctx.render("note", {
            title: "note",
            isNote: true,
            message: `Note is "${note.note}"`,
            note: note,
        });
    } else {
        // let err = new Error('Page Not Found')
        // err.statusCode = 404
        // err.message = `note with id ${id} is not found`
        // throw err

        ctx.throw(400, `note with id ${id} is not found`);
    }
});

router.get("/update/:id", async (ctx) => {
    const id = ctx.params.id;

    if (!checkers.objectIdIsValid(id)) ctx.throw(400, `id is not valid`);

    const note = await db.collection(`test`).findOne({_id: ObjectId(id)});

    if (note) {
        await ctx.render("update-note", {
            title: "update-note",
            message: `update Note "${note.note}"`,
            note: note,
        });
    } else {
        ctx.throw(404, `note with id ${id} is not found`);
    }
});

router.post("/note", async (ctx) => {
    const resultValidation = await validators.noteValidator(ctx.request.body);

    if (!resultValidation) console.error(validators.noteValidator.errors);

    const {title, note} = ctx.request.body;
    const existingNote = await db.collection(`test`).findOne({title: title});

    if (existingNote) {
        ctx.throw(409, `заметка с таким заголовком уже существует.`);
    }

    const result = await db.collection(`test`).insertOne(ctx.request.body);

    await ctx.render("note", {
        title: "note",
        isCreate: true,
        message: "Вы создали заметку, поздравляем!",
        note: result.ops[0],
    });
});

router.put("/update/:id", async (ctx) => {
    // await validators.noteValidator(ctx.request.body)

    // const resultValidation = await validators.noteValidator(ctx.request.body);
    //
    // if (!resultValidation) console.error(validators.noteValidator.errors);

    console.log('put', ctx.params)

    const {id, title, note} = ctx.request.body;

    console.log('id', id)
    console.log('title', title)
    console.log('note', note)

    await db
        .collection(`test`)
        .updateOne({_id: ObjectId(id)}, {$set: {title: title, note: note}})
})

router.delete("/note/:id", async (ctx) => {
    const id = ctx.params.id;

    if (!checkers.objectIdIsValid(id)) ctx.throw(400, `id is not valid`);

    const note = await db.collection(`test`).findOne({id: id});

    await db.collection(`test`).deleteOne({_id: ObjectId(id)});
});

app.use(router.routes());

const PORT = parseInt(process.env.PORT || 8000)
const HOST = process.env.HOST || `127.0.0.1`

app.listen(PORT, HOST, () => {
    console.log(`Listen with Koa on ${HOST}:${PORT}`);
});
