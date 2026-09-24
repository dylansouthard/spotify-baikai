export const formatMcpReturnError = (error, failureMessage) => {
    const message = error.response?.data?.error?.message || failureMessage
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

export const getMcpAnnotations = (readOnlyHint = true, openWorldHint = true) => {
    return {
        annotations: {
            readOnlyHint,
            openWorldHint
        }
    }
}