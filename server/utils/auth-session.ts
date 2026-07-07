import { createError, getHeaders, type H3Event } from "h3";
import { auth } from "./auth";

function getEventHeaders(event: H3Event) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(getHeaders(event))) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  return headers;
}

export async function getAuthSession(event: H3Event) {
  try {
    const session = await auth.api.getSession({
      headers: getEventHeaders(event),
    });
    if (session) {
      (event.context as Record<string, unknown>).authSession = session;
    }
    return session;
  } catch {
    return null;
  }
}

export async function requireSession(event: H3Event) {
  const session = await getAuthSession(event);
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }
  return session;
}
