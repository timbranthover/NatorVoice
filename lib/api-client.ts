const explicitBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";

function normalizeBase(base: string) {
  return base.replace(/\/$/, "");
}

export function getApiBaseUrl() {
  if (!explicitBase) {
    return "";
  }

  return normalizeBase(explicitBase);
}

export function buildApiUrl(path: string) {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

export function cloudSyncConfigured() {
  return process.env.NEXT_PUBLIC_ENABLE_CLOUD_SYNC === "true";
}
