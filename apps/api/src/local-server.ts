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
  updateApplicationStatus,
  deleteApplication,
} from "./handlers.js";
import { loginUser, registerUser, verifyToken } from "./domain/auth.js";

const port = Number(process.env.PORT ?? 4100);

function jsonResponse(statusCode: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "content-type": "application/json" },
  });
}

function corsHeaders(response: Response): Response {
  response.headers.set("access-control-allow-origin", "*");
  response.headers.set("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.headers.set("access-control-allow-headers", "content-type,authorization");
  return response;
}

function getUserId(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  return verifyToken(token);
}

async function route(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return corsHeaders(jsonResponse(204, null));
  }

  try {
    if (url.pathname === "/health") return jsonResponse(200, { ok: true });

    if (url.pathname === "/auth/register" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(201, registerUser(body));
    }

    if (url.pathname === "/auth/login" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(200, loginUser(body));
    }

    const userId = getUserId(request);
    if (!userId) {
      return jsonResponse(401, { message: "Unauthorized" });
    }

    if (url.pathname === "/auth/me" && request.method === "GET") {
      return jsonResponse(200, { userId });
    }

    if (url.pathname === "/applications" && request.method === "GET") {
      return jsonResponse(200, listApplications(userId));
    }

    if (url.pathname === "/applications" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(201, createApplication({ ...body, userId }));
    }

    const appMatch = url.pathname.match(/^\/applications\/([^/]+)$/);
    if (appMatch && request.method === "PATCH") {
      const body = await request.json();
      return jsonResponse(200, updateApplicationStatus(userId, appMatch[1], body));
    }

    if (appMatch && request.method === "DELETE") {
      return jsonResponse(200, deleteApplication(userId, appMatch[1]));
    }

    if (url.pathname === "/allowlist" && request.method === "GET") {
      return jsonResponse(200, listAllowlist(userId));
    }

    if (url.pathname === "/allowlist" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(201, addAllowlistRule({ ...body, userId }));
    }

    if (url.pathname === "/ingestions" && request.method === "GET") {
      return jsonResponse(200, listIngestionLog(userId));
    }

    if (url.pathname === "/ingestions" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(201, ingestEmail({ ...body, userId }));
    }

    if (url.pathname === "/followups" && request.method === "GET") {
      return jsonResponse(200, listFollowups(userId));
    }

    if (url.pathname === "/followups" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(201, generateFollowup({ ...body, userId }));
    }

    if (url.pathname === "/privacy/export" && request.method === "GET") {
      return jsonResponse(200, exportUserData(userId));
    }

    if (url.pathname === "/privacy/delete" && request.method === "POST") {
      return jsonResponse(202, deleteAccount(userId));
    }

    if (url.pathname === "/oauth" && request.method === "GET") {
      return jsonResponse(200, listOAuthConnections(userId));
    }

    if (url.pathname === "/oauth/connect" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(201, connectOAuth({ ...body, userId }));
    }

    if (url.pathname === "/oauth/revoke" && request.method === "POST") {
      const body = await request.json();
      return jsonResponse(200, revokeOAuth({ ...body, userId }));
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
  } as RequestInit & { duplex: "half" });

  route(request)
    .then(async (response) => {
      const corsResponse = corsHeaders(response);
      res.statusCode = corsResponse.status;
      corsResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      const body = await corsResponse.text();
      res.end(body);
    })
    .catch((error) => {
      res.statusCode = 500;
      res.setHeader("access-control-allow-origin", "*");
      res.end(JSON.stringify({ message: error instanceof Error ? error.message : "Unexpected error" }));
    });
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
