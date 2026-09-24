import * as z from "zod/v4"

const serverInfoSchema = z.object({
    service: z.literal('spotify-baikai'),
    status: z.literal('ok')
})

export const registerServerInfoTool = (server) => {
    server.registerTool(
        "get_server_info",
        {
            description: "Return basic static information about the spotify-baikai MCP server.",
            inputSchema: z.object({}).strict(),
            outputSchema: serverInfoSchema
        },
        async () => {
            const info = {
                service: 'spotify-baikai',
                status: 'ok'
            }
            return {
                content: [
                    {type: 'text', text: JSON.stringify(info)}
                ],
                structuredContent: info
            }
        }
       
    )
}