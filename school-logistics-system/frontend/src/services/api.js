const API_URL = import.meta.env.VITE_API_URL || "/api";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("srmsToken");
  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
      },
      ...options,
    });
  } catch {
    throw new Error("Unable to connect to the server. Start the backend with npm run dev in the backend folder.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}.`);
  }

  if (endpoint === "/auth/signup" && (!data.user || !data.token)) {
    throw new Error("The account was not created. The server returned an incomplete response.");
  }

  return data;
}

export const authAPI = {
  signup: (details) =>
    apiRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify(details),
    }),
  login: (credentials) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
};

export const resourceAPI = {
  getAll: () => apiRequest("/resources"),
  create: (resource) => apiRequest("/resources", { method: "POST", body: JSON.stringify(resource) }),
  receive: (resourceId, quantity) => apiRequest(`/resources/${resourceId}/receive`, { method: "PATCH", body: JSON.stringify({ quantity }) }),
};

export const requestAPI = {
  getMyRequests: () => apiRequest("/requests/my"),
  create: (request) => apiRequest("/requests", { method: "POST", body: JSON.stringify(request) }),
  getAll: () => apiRequest("/requests/all"),
  updateStatus: (id, status) => apiRequest(`/requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

export const userAPI = {
  getAll: () => apiRequest("/users/all"),
  updateStatus: (id, status) => apiRequest(`/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  delete: (id) => apiRequest(`/users/${id}`, { method: "DELETE" }),
  updateMe: (details) =>
    apiRequest("/users/me", {
      method: "PATCH",
      body: JSON.stringify(details),
    }),
};

export const distributionAPI = {
  getMySchedules: () => apiRequest("/distribution/schedules/my"),
  createSchedule: (schedule) => apiRequest("/distribution/schedules", { method: "POST", body: JSON.stringify(schedule) }),
  release: (allocationId) => apiRequest(`/distribution/allocations/${allocationId}/release`, { method: "POST" }),
};

export const allocationAPI = {
  getMine: () => apiRequest("/allocations/my"),
  getAll: () => apiRequest("/allocations"),
};

export const inventoryAPI = {
  getAll: () => apiRequest("/inventory"),
};