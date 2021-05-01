exports.checkUserAccessRights = async (ctx, db, permissions) => {
    const errorMessage = 'permission denied (you cannot modify the note)'

    const userRoles = await db.collection('roles').find({key: {$in: ctx.user.roles}}).toArray()
    const userPermissions = userRoles.reduce((acc, cur) => {
        return [...acc, ...cur.permissions]
    }, [])
    const uniqueUserPermissions = [...new Set(userPermissions)]

    if (!uniqueUserPermissions.length > 0 || !uniqueUserPermissions.includes(permissions))
        return ctx.throw(403, errorMessage)

    return
}