import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const ignored = new Set(['.git', 'node_modules', 'data'])
const files = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(fullPath)
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath)
  }
}

walk(root)
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' })
}
console.log(`Syntax OK: ${files.length} JavaScript files`)
