/**
 * Converts a Web Fetch Request into an Express req/res and returns a Web Response.
 * Used when http.createServer is not available (e.g. production Workers with unenv).
 */
import type { Express } from 'express';

export async function fetchToExpress(request: Request, app: Express): Promise<Response> {
  const url = new URL(request.url);
  const req = await makeReq(request, url);
  const { res, responsePromise } = makeRes();
  (app as (req: unknown, res: unknown) => void)(req, res);
  return responsePromise;
}

async function makeReq(request: Request, url: URL): Promise<unknown> {
  const { Readable } = await import('node:stream');
  const body =
    request.body != null
      ? Readable.fromWeb(request.body as import('stream/web').ReadableStream)
      : Readable.from([]);
  const req = body as unknown as Record<string, unknown>;
  req.method = request.method;
  req.url = url.pathname + url.search;
  req.headers = Object.fromEntries(request.headers.entries());
  req.socket = {
    destroyed: false,
    encrypted: false,
    destroy() {},
  };
  return req;
}

function makeRes(): { res: unknown; responsePromise: Promise<Response> } {
  let resolveResponse!: (r: Response) => void;
  const responsePromise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });

  const chunks: Buffer[] = [];
  let statusCode = 200;
  const outHeaders: Record<string, string> = {};

  function finish(body: string) {
    resolveResponse(
      new Response(body || null, { status: statusCode, headers: outHeaders })
    );
  }

  const res = {
    statusCode: 200,
    writeHead(code: number, headers?: Record<string, string> | [string, string][]) {
      statusCode = code;
      this.statusCode = code;
      if (headers && typeof headers === 'object')
        (Array.isArray(headers)
          ? headers
          : Object.entries(headers)
        ).forEach(([k, v]) => {
          const val = Array.isArray(v) ? v[1] : v;
          if (typeof val === 'string') outHeaders[k.toLowerCase()] = val;
        });
      return this;
    },
    setHeader(name: string, value: string | number | string[]) {
      outHeaders[name.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
      return this;
    },
    getHeader(name: string) {
      return outHeaders[name.toLowerCase()];
    },
    write(chunk: unknown) {
      if (chunk != null) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    },
    end(chunk?: unknown) {
      if (chunk != null) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      finish(Buffer.concat(chunks).toString('utf8'));
      return this;
    },
    // Express response helpers
    status(code: number) {
      statusCode = code;
      this.statusCode = code;
      return this;
    },
    send(body: unknown) {
      const isJson = typeof body === 'object' && body !== null;
      const s = isJson ? JSON.stringify(body) : String(body ?? '');
      if (!outHeaders['content-type'])
        this.setHeader('Content-Type', isJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8');
      finish(s);
      return this;
    },
    json(body: unknown) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
      finish(JSON.stringify(body));
      return this;
    },
  };

  return { res, responsePromise };
}
