import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null }
global.mongooseCache = cached

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set')
  }

  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 20000,
      })
      .catch((error) => {
        cached.promise = null
        throw error
      })
  }

  cached.conn = await cached.promise
  return cached.conn
}

export default dbConnect
