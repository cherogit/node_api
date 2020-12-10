// const ajv = new Ajv({useDefaults: true})
const Ajv = require("ajv").default
const ajv = require("ajv-formats")(new Ajv({useDefaults: true}))

const noteCreationScheme = {
    $async: true,
    type: 'object',
    properties: {
        title: {
            type: 'string',
            minLength: 5,
            maxLength: 30
        },
        note: {type: 'string'},
        labels: {
            type: 'array',
            items: {
                type: 'string'
            }
        },
        publication_date: {
            oneOf: [
                {
                    type: 'null'
                },
                {
                    type: 'string',
                    format: 'date'
                }
            ]
        }
    },
    required: ['title', 'note']
}

module.exports = ajv.compile(noteCreationScheme)