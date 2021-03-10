const {PWD_SALT} = require('./constants')

const crypto = require("crypto")
const util = require("util")
const pbkdf2 = util.promisify(crypto.pbkdf2)

exports.hashPassword = async (password) => {
    return (await pbkdf2(password, PWD_SALT, 100000, 64, "sha512")).toString(
        "hex"
    )
}