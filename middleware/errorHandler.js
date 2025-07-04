const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  res.status(statusCode)
  res.json({
    error: true,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    type: err.type ?? 'none',
  })
}

export default errorHandler
