declare module 'cloudflare:node' {
  export function handleAsNodeRequest(port: number, request: Request): Promise<Response>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}
