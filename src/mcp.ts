/**
 * repoready MCP server. Tools: assess_readiness.
 *
 * Why the low-level Server instead of McpServer: the high-level
 * helper converts zod schemas to JSON Schema and injects keys
 * not in this tool's defined spec ("$schema" and
 * "additionalProperties"), which breaks exact tool-list/schema
 * parity with the spec. This file serves tools/list with the
 * spec's exact input schema as an explicit literal, and every
 * tools/call is validated by the core, which names the
 * offending path on invalid input.
 *
 * The assessment is pure local computation: no upstream API,
 * no authentication, no configuration, and nothing is ever
 * executed — the tool assesses supplied facts only.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { assessReadiness, formatPayload, VERSION } from "./repoready.js";

const TOOLS = [
  {
    name: "assess_readiness",
    description:
      "Assess first-contributor readiness from repo files and package scripts: README, install and test documentation, license, contributing guide, CI, and a lockfile.",
    inputSchema: {
      type: "object" as const,
      properties: {
        files: {
          type: "array",
          description: "Repo files to assess (at least one)",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Repo-relative file path (unique across the set)",
              },
              content: {
                type: "string",
                description: "File content; used for the README checks (optional)",
              },
            },
            required: ["path"],
          },
        },
        package_scripts: {
          type: "object",
          description: "package.json scripts as a string-to-string map (optional)",
          additionalProperties: { type: "string" },
        },
      },
      required: ["files"],
    },
  },
];

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function errorResult(err: unknown) {
  return {
    content: [
      { type: "text" as const, text: err instanceof Error ? err.message : String(err) },
    ],
    isError: true,
  };
}

const server = new Server(
  { name: "repoready", version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let out: unknown;
    if (name === "assess_readiness") {
      out = assessReadiness(args ?? {});
    } else {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    return textResult(formatPayload(out));
  } catch (err) {
    if (err instanceof McpError) throw err;
    return errorResult(err);
  }
});

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

void main();
