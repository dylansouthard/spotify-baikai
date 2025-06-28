import './util/errorHandler.js'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import apiRoutes from './routes/api.js'
import errorHandler from './middleware/errorHandler.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

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

app.use(cors())
app.use(express.json())

app.use('/', apiRoutes)
app.use(errorHandler)

app.use('/robots.txt', function (req, res, next) {
  res.type('text/plain')
  res.send('User-agent: *\nDisallow: /')
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
