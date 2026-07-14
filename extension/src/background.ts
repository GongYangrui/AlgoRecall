type StoredConnection = { token: string; connectionId: string; expiresAt: string };
type PendingPairing = { pairingId: string; pairingSecret: string; expiresAt: string; pollIntervalMs: number };
type RequestMessage =
  | { type: "GET_CONNECTION" }
  | { type: "CONNECT"; deviceName?: string }
  | { type: "GET_PROBLEM"; titleSlug: string }
  | { type: "SUBMIT_REVIEW"; titleSlug: string; result: string; note: string; idempotencyKey: string }
  | { type: "OPEN_CONNECTIONS" };

const CONNECTION_KEY = "algorecall.connection";
const PAIRING_KEY = "algorecall.pendingPairing";

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

async function readConnection() {
  const stored = await chrome.storage.local.get(CONNECTION_KEY);
  const connection = stored[CONNECTION_KEY] as StoredConnection | undefined;
  if (!connection || Date.parse(connection.expiresAt) <= Date.now()) {
    if (connection) await chrome.storage.local.remove(CONNECTION_KEY);
    return null;
  }
  return connection;
}

async function apiFetch<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (authenticated) {
    const connection = await readConnection();
    if (!connection) throw new ApiError(401, "EXTENSION_AUTH_REQUIRED", "请先连接 AlgoRecall");
    headers.set("Authorization", `Bearer ${connection.token}`);
  }
  let response: Response;
  try {
    response = await fetch(`${__ALGO_RECALL_API_ORIGIN__}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "OFFLINE", "无法连接 AlgoRecall");
  }
  const body = await response.json().catch(() => ({})) as { data?: { code?: string }; statusMessage?: string };
  if (!response.ok) {
    const code = body.data?.code || (response.status === 401 ? "EXTENSION_AUTH_REQUIRED" : "REQUEST_FAILED");
    if (code === "EXTENSION_AUTH_REQUIRED") await chrome.storage.local.remove(CONNECTION_KEY);
    throw new ApiError(response.status, code, body.statusMessage || "请求失败");
  }
  return body as T;
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function connect(deviceName = "Chrome 扩展", tabId?: number) {
  const created = await apiFetch<PendingPairing & { verificationUrl: string; userCode: string }>("/api/extension/pairings", {
    method: "POST",
    body: JSON.stringify({ deviceName }),
  });
  const pending: PendingPairing = {
    pairingId: created.pairingId,
    pairingSecret: created.pairingSecret,
    expiresAt: created.expiresAt,
    pollIntervalMs: created.pollIntervalMs,
  };
  await chrome.storage.local.set({ [PAIRING_KEY]: pending });
  await chrome.tabs.create({ url: created.verificationUrl });
  if (tabId !== undefined) {
    await chrome.tabs.sendMessage(tabId, { type: "PAIRING_STARTED", userCode: created.userCode }).catch(() => undefined);
  }

  while (Date.parse(pending.expiresAt) > Date.now()) {
    await delay(pending.pollIntervalMs);
    const result = await apiFetch<
      | { status: "pending" }
      | { status: "denied" }
      | { status: "expired" }
      | { status: "approved"; token: string; connectionId: string; expiresAt: string }
    >(`/api/extension/pairings/${pending.pairingId}/token`, {
      method: "POST",
      body: JSON.stringify({ pairingSecret: pending.pairingSecret }),
    });
    if (result.status === "pending") continue;
    await chrome.storage.local.remove(PAIRING_KEY);
    if (result.status === "denied") throw new ApiError(403, "PAIRING_DENIED", "连接请求已被拒绝");
    if (result.status === "expired") throw new ApiError(410, "PAIRING_EXPIRED", "连接请求已过期");
    const connection: StoredConnection = { token: result.token, connectionId: result.connectionId, expiresAt: result.expiresAt };
    await chrome.storage.local.set({ [CONNECTION_KEY]: connection });
    return { connected: true, expiresAt: connection.expiresAt };
  }
  await chrome.storage.local.remove(PAIRING_KEY);
  throw new ApiError(410, "PAIRING_EXPIRED", "连接请求已过期");
}

async function retryReview(message: Extract<RequestMessage, { type: "SUBMIT_REVIEW" }>) {
  const body = JSON.stringify({
    titleSlug: message.titleSlug,
    result: message.result,
    note: message.note || null,
    idempotencyKey: message.idempotencyKey,
  });
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await apiFetch("/api/extension/reviews", { method: "POST", body }, true);
    } catch (error) {
      lastError = error;
      if (!(error instanceof ApiError) || error.code !== "OFFLINE" || attempt === 1) throw error;
      await delay(500);
    }
  }
  throw lastError;
}

async function handleMessage(message: RequestMessage, sender: chrome.runtime.MessageSender) {
  if (message.type === "GET_CONNECTION") {
    const connection = await readConnection();
    return { connected: Boolean(connection), expiresAt: connection?.expiresAt || null };
  }
  if (message.type === "CONNECT") return connect(message.deviceName, sender.tab?.id);
  if (message.type === "GET_PROBLEM") {
    return apiFetch(`/api/extension/problems/${encodeURIComponent(message.titleSlug)}`, {}, true);
  }
  if (message.type === "SUBMIT_REVIEW") return retryReview(message);
  if (message.type === "OPEN_CONNECTIONS") {
    await chrome.tabs.create({ url: `${__ALGO_RECALL_API_ORIGIN__}/settings/extensions` });
    return { ok: true };
  }
  throw new ApiError(400, "UNKNOWN_MESSAGE", "未知请求");
}

chrome.runtime.onMessage.addListener((message: RequestMessage, _sender, sendResponse) => {
  void handleMessage(message, _sender)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error: unknown) => {
      const apiError = error instanceof ApiError ? error : new ApiError(500, "UNEXPECTED_ERROR", "发生了意外错误");
      sendResponse({ ok: false, error: { status: apiError.status, code: apiError.code, message: apiError.message } });
    });
  return true;
});
