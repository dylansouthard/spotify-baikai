export const formatMcpReturnError = (error, failureMessage) => {
    const message = error.response?.data?.error?.message || error.message || failureMessage
    return {
        content: [{type: 'text', text: message}],
        isError:true
    }
}

export const formatMcpJsonResponse = (result) => {
    return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
          structuredContent: result,
        }
}

export const getMcpAnnotations = ({
  readOnlyHint = true,
  destructiveHint,
  idempotentHint,
  openWorldHint = true,
} = {}) => {
  return {
    readOnlyHint,
    ...(destructiveHint !== undefined && { destructiveHint }),
    ...(idempotentHint !== undefined && { idempotentHint }),
    openWorldHint,
  }
}

export const getMcpSecurityMeta = () => ({
  securitySchemes: [
    {
      type: 'oauth2',
      scopes: [
        'mcp:access',
      ],
    },
  ],
})