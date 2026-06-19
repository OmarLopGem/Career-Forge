import { ObjectId } from 'mongodb'

export function toObjectId(id) {
  if (typeof id === 'string' && ObjectId.isValid(id)) {
    return new ObjectId(id)
  }

  return null
}

export function stringifyId(doc) {
  if (!doc) return null

  const { _id, ...rest } = doc

  return {
    _id: _id ? String(_id) : undefined,
    ...rest,
  }
}
