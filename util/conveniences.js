export const throwError = (err, res, message = null) => {
  res.status(err.status)
  const error = {
    message: message ?? err.message,
    type: err.type,
  }
  throw error
}
