// Keep the default on the same origin so Vite/Vercel can proxy API requests.
export function resolveApiBase(value) {
  const base = (value || "").trim().replace(/\/+$/, "");
  return base || "/api";
}

export async function readApiResponse(response) {
  if (response.status === 204) return {};

  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error(response.ok
      ? "The server returned an invalid response. Please check the API configuration."
      : response.status >= 500
        ? "The service is temporarily unavailable. Please try again shortly."
        : `Request failed with status ${response.status}.`);
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(data?.message || (response.status >= 500
      ? "The service is temporarily unavailable. Please try again shortly."
      : `Request failed with status ${response.status}.`));
    error.status = response.status;
    error.requiresVerification = data?.requiresVerification;
    error.email = data?.email;
    error.retryAfterSeconds = data?.retryAfterSeconds;
    error.lockedUntil = data?.lockedUntil;
    throw error;
  }

  return data;
}
