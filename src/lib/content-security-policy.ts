export function storageConnectSource(env: NodeJS.ProcessEnv = process.env) {
  const endpoint = env.AWS_ENDPOINT_URL_S3 || env.S3_ENDPOINT;
  if (!endpoint) return null;

  try {
    const url = new URL(endpoint);
    const isSecure = url.protocol === "https:";
    const isLocalDevelopment = env.NODE_ENV !== "production"
      && url.protocol === "http:"
      && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

    return isSecure || isLocalDevelopment ? url.origin : null;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy(env: NodeJS.ProcessEnv = process.env) {
  const storageOrigin = storageConnectSource(env);
  const connectSources = ["'self'", storageOrigin].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src ${connectSources}`,
  ].join("; ");
}
