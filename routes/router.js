const Router = require('koa-router')
const multer = require('@koa/multer')

exports.router = new Router()
exports.upload = multer()