export function loggerMiddleware(req: any, _res: any, next: Function) {
  const now = new Date().toISOString()
  console.log(`[${now}] ${req.method} ${req.url}`)
  next()
}