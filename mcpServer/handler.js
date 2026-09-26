import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";

// Temporary discovery test: expose only ping to isolate catalog compatibility.
export const mcpHttpHandler = createMcpHandler(() => {
    const server = new McpServer({
        name: 'spotify-baikai',
        version: '1.0.0',
    })

    server.registerTool(
        'ping',
        {
            title: 'Ping',
            description: 'Returns pong to verify the MCP connection.',
            inputSchema: {},
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                openWorldHint: false,
            },
            _meta: {
                securitySchemes: [{ type: 'noauth' }],
            },
        },
        async () => ({
            content: [{ type: 'text', text: 'pong' }],
        }),
    )

    return server
}, {
    legacy: 'stateless'
})

const nodeHandler = toNodeHandler(mcpHttpHandler)

export const handleMcpRequest = (req, res) => {
    void nodeHandler(req, res, req.body)
}

export const handleMcpJsonParseError = (err, req, res, next) => {
  if (req.path !== "/mcp" || err?.type !== "entity.parse.failed") {
    return next(err);
  }

  return res.status(400).json({
    jsonrpc: "2.0",
    error: {
      code: -32700,
      message: "Parse error: the request body is not valid JSON",
    },
    id: null,
  });
};
