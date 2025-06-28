import fs from 'fs'

const errorLogStream = fs.createWriteStream('./error.log', { flags: 'a' })

process.on('uncaughtException', (err) => {
  errorLogStream.write(`Uncaught Exception: ${err.stack}\n`)
})

process.on('unhandledRejection', (reason, promise) => {
  errorLogStream.write(`Unhandled Rejection: ${reason}\n`)
})

console.error = function (...args) {
  errorLogStream.write(args.map(String).join(' ') + '\n')
  process.stderr.write(args.map(String).join(' ') + '\n')
}
