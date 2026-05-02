import { createServer, IncomingMessage, ServerResponse } from "node:http";
import {
  addAllowlistRule,
  connectOAuth,
  createApplication,
  deleteAccount,
  exportUserData,
  generateFollowup,
  ingestEmail,
  listAllowlist,
  listApplications,
  listFollowups,
  listIngestionLog,
  listOAuthConnections,
  revokeOAuth,
} from "./handlers.js";

const port = Number(process.env.PORT ?? 4100);
const defaultUserId = "demo-user";

function jsonResponse(statusCode: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "content-type": "application/json" },
  });
}

async function route(request: Request): Promise<Response> {
  const url = new URL(request.url);

  try {
    if (url.pathname === "/health") return jsonResponse(200, { ok: true });

    if (url.pathname === "/applications" && request.method === "GET") {
      return jsonResponse(200, listApplications(defaultUserId));
    }

    if (url.pathname === "/applications" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(201, createApplication({ ...body, userId: defaultUserId }));
    }

    if (url.pathname === "/allowlist" && request.method === "GET") {
      return jsonResponse(200, listAllowlist(defaultUserId));
    }

    if (url.pathname === "/allowlist" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(201, addAllowlistRule({ ...body, userId: defaultUserId }));
    }

    if (url.pathname === "/ingestions" && request.method === "GET") {
      return jsonResponse(200, listIngestionLog(defaultUserId));
    }

    if (url.pathname === "/ingestions" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(201, ingestEmail({ ...body, userId: defaultUserId }));
    }

    if (url.pathname === "/followups" && request.method === "GET") {
      return jsonResponse(200, listFollowups(defaultUserId));
    }

    if (url.pathname === "/followups" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(201, generateFollowup({ ...body, userId: defaultUserId }));
    }

    if (url.pathname === "/privacy/export" && request.method === "GET") {
      return jsonResponse(200, exportUserData(defaultUserId));
    }

    if (url.pathname === "/privacy/delete" && request.method === "POST") {
      return jsonResponse(202, deleteAccount(defaultUserId));
    }

    if (url.pathname === "/oauth" && request.method === "GET") {
      return jsonResponse(200, listOAuthConnections(defaultUserId));
    }

    if (url.pathname === "/oauth/connect" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(201, connectOAuth({ ...body, userId: defaultUserId }));
    }

    if (url.pathname === "/oauth/revoke" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(200, revokeOAuth({ ...body, userId: defaultUserId }));
    }

    return jsonResponse(404, { message: "Not found" });
  } catch (error) {
    return jsonResponse(400, { message: error instanceof Error ? error.message : "Invalid request" });
  }
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const protocol = "http:";
  const host = req.headers.host ?? `localhost:${port}`;
  const request = new Request(`${protocol}//${host}${req.url}`, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req.method === "GET" || req.method === "HEAD" ? null : req,
    duplex: "half",
    // Node fetch streams request bodies with duplex mode enabled.
  } as RequestInit & { duplex: "half" });

  route(request)
    .then(async (response) => {
      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      const body = await response.text();
      res.end(body);
    })
    .catch((error) => {
      res.statusCode = 500;
      res.end(JSON.stringify({ message: error instanceof Error ? error.message : "Unexpected error" }));
    });
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
