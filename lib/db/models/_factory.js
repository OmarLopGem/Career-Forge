import mongoose from 'mongoose'
import { getMongooseConnection } from '../mongoose.js'

// Compile each model on the default Mongoose connection exactly once so hot
// reloads and repeated imports do not produce duplicate model registrations.
function buildModel(name, schema) {
  if (mongoose.models[name]) return mongoose.models[name]
  return mongoose.model(name, schema)
}

export async function getModel(name, schemaFactory) {
  await getMongooseConnection()
  const schema = schemaFactory(mongoose.Schema)
  schema.set('strict', false)
  schema.set('versionKey', false)
  return buildModel(name, schema)
}