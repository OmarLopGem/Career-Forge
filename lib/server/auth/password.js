import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

const KEY_LENGTH = 64

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, KEY_LENGTH)

  return `${salt}:${Buffer.from(derivedKey).toString('hex')}`
}

export async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false
  }

  const [salt, hash] = storedHash.split(':')
  const derivedKey = await scrypt(password, salt, KEY_LENGTH)
  const storedBuffer = Buffer.from(hash, 'hex')
  const derivedBuffer = Buffer.from(derivedKey)

  if (storedBuffer.length !== derivedBuffer.length) {
    return false
  }

  return timingSafeEqual(storedBuffer, derivedBuffer)
}
