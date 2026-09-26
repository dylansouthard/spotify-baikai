import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createServer } from "./createServer.js";

export const mcpHttpHandler = createMcpHandler(createServer, {
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
