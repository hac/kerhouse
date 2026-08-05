// lib/db.ts
import { neon } from "@neondatabase/serverless"

let _sql: ReturnType<typeof neon> | null = null

export function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set")
    }
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

// Backwards-compatible tagged-template / function call proxy
function sqlProxy(strings: TemplateStringsArray, ...values: unknown[]) {
  return getSql()(strings, ...values)
}

const handler: ProxyHandler<typeof sqlProxy> = {
  get(_target, prop) {
    const client = getSql()
    const value = (client as any)[prop]
    if (typeof value === "function") {
      return value.bind(client)
    }
    return value
  },
  apply(_target, _thisArg, args) {
    return (getSql() as any)(...args)
  },
}

export const sql = new Proxy(sqlProxy, handler)
