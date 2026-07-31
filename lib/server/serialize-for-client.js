export function serializeForClient(value) {
  return JSON.parse(JSON.stringify(value))
}
