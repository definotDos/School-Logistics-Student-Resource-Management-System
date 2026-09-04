const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Generic API request wrapper with authentication
 * Handles token management and error responses
 */
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

  return data;
}

// ============================================
// AUTHENTICATION API (Step 1)
// ============================================

export const authAPI = {
  /**
   * Sign up new user
   */
  signup: (details) =>
    apiRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify(details),
    }),

  /**
   * Login user
   * Response: { token, user }
   */
  login: (credentials) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  /**
   * Verify email with code
   */
  verifyEmail: (details) =>
    apiRequest("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(details),
    }),

  /**
   * Resend verification code
   */
  resendVerificationCode: (email) =>
    apiRequest("/auth/resend-verification-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  /**
   * Logout (client-side only, clears token)
   */
  logout: () => {
    localStorage.removeItem("srmsToken");
    localStorage.removeItem("srmsUser");
  },
};

// ============================================
// RESOURCE API
// ============================================

export const resourceAPI = {
  /**
   * Get all available resources
   */
  getAll: () => apiRequest("/resources"),

  /**
   * Get resources by campus
   */
  getByCampus: (campus) => 
    apiRequest(`/resources?campus=${encodeURIComponent(campus)}`),

  /**
   * Create new resource (admin only)
   */
  create: (resource) => 
    apiRequest("/resources", { 
      method: "POST", 
      body: JSON.stringify(resource) 
    }),

  /**
   * Update resource
   */
  update: (resourceId, resource) =>
    apiRequest(`/resources/${resourceId}`, {
      method: "PATCH",
      body: JSON.stringify(resource),
    }),

  /**
   * Receive/add quantity to resource
   */
  receive: (resourceId, quantity) => 
    apiRequest(`/resources/${resourceId}/receive`, { 
      method: "PATCH", 
      body: JSON.stringify({ quantity }) 
    }),
};

// ============================================
// REQUEST API (Steps 2-3)
// ============================================

export const requestAPI = {
  /**
   * Step 2: Student creates resource request
   */
  create: (request) =>
    apiRequest("/requests", {
      method: "POST",
      body: JSON.stringify(request),
    }),

  cancel: (requestId) => apiRequest(`/requests/${requestId}/cancel`, { method: "PATCH" }),

  /**
   * Step 2: Get my requests (student view)
   */
  getMyRequests: () => 
    apiRequest("/requests/my"),

  /**
   * Get all requests (staff/admin)
   */
  getAll: () => 
    apiRequest("/requests/all"),

  /**
   * Get request by ID
   */
  getById: (requestId) =>
    apiRequest(`/requests/${requestId}`),

  /**
   * Get requests by status
   * Status: pending, approved, rejected, ready_for_claim, claimed, released, completed
   */
  getByStatus: (status) =>
    apiRequest(`/requests/status/${status}`),

  /**
   * Step 3: Verify eligibility (staff only)
   */
  verifyEligibility: (requestId, details) =>
    apiRequest(`/requests/${requestId}/verify-eligibility`, {
      method: "POST",
      body: JSON.stringify(details),
    }),

  /**
   * Step 3: Approve request (admin only)
   */
  approve: (requestId, details) =>
    apiRequest(`/requests/${requestId}/approve`, {
      method: "POST",
      body: JSON.stringify(details),
    }),

  /**
   * Step 3: Reject request (admin only)
   */
  reject: (requestId, details) =>
    apiRequest(`/requests/${requestId}/reject`, {
      method: "POST",
      body: JSON.stringify(details),
    }),

  /**
   * Generic staff/admin request status update stored to the database
   */
  updateStatus: (requestId, details) =>
    apiRequest(`/requests/${requestId}/status`, {
      method: "POST",
      body: JSON.stringify(details),
    }),
};

// ============================================
// ALLOCATION API (Steps 4-5)
// ============================================

export const allocationAPI = {
  /**
   * Step 4: Admin processes allocation
   */
  process: (requestId, details) =>
    apiRequest(`/allocations/${requestId}/process`, {
      method: "POST",
      body: JSON.stringify(details),
    }),

  /**
   * Step 5: Staff creates claim schedule
   */
  createSchedule: (allocationId, schedule) =>
    apiRequest(`/allocations/${allocationId}/schedule`, {
      method: "POST",
      body: JSON.stringify(schedule),
    }),

  assignStaff: (allocationId, staffId) =>
    apiRequest(`/allocations/${allocationId}/assign-staff`, {
      method: "PATCH",
      body: JSON.stringify({ staffId }),
    }),

  /**
   * Get all allocations (staff/admin)
   */
  getAll: () => 
    apiRequest("/allocations/all"),

  /**
   * Get student's allocations
   */
  getMine: () => 
    apiRequest("/allocations/my"),

  /**
   * Get allocation by ID
   */
  getById: (allocationId) =>
    apiRequest(`/allocations/${allocationId}`),

  /**
   * Get allocations by status
   * Status: Reserved, Scheduled, Verified, Released
   */
  getByStatus: (status) =>
    apiRequest(`/allocations/status/${status}`),
};

// ============================================
// DISTRIBUTION API (Steps 6-8)
// ============================================

export const distributionAPI = {
  /**
   * Step 6: Get my claim schedules (student view)
   */
  getMySchedules: () => 
    apiRequest("/distribution/schedules/my"),

  /**
   * Get all claim schedules (staff/admin)
   */
  getAllSchedules: () =>
    apiRequest("/distribution/schedules"),

  /**
   * Step 7: Verify student identity at claim (staff only)
   */
  verifyClaimIdentity: (scheduleId, details) =>
    apiRequest(`/distribution/schedules/${scheduleId}/verify`, {
      method: "POST",
      body: JSON.stringify(details),
    }),

  /**
   * Step 8: Release resource to student (staff only)
   */
  release: (allocationId, details) =>
    apiRequest(`/distribution/allocations/${allocationId}/release`, {
      method: "POST",
      body: JSON.stringify(details),
    }),

  /**
   * Get all distributions
   */
  getAll: () =>
    apiRequest("/distribution"),

  /**
   * Get distribution by ID
   */
  getById: (distributionId) =>
    apiRequest(`/distribution/${distributionId}`),

  /**
   * Get distributions by status
   */
  getByStatus: (status) =>
    apiRequest(`/distribution/status/${status}`),

  /**
   * Step 9: Get distribution progress/monitoring data
   */
  getProgress: () =>
    apiRequest("/distribution/progress"),
};

// ============================================
// INVENTORY API
// ============================================

export const inventoryAPI = {
  /**
   * Get all inventory
   */
  getAll: () => 
    apiRequest("/inventory"),

  /**
   * Get inventory for specific resource
   */
  getByResource: (resourceId) =>
    apiRequest(`/inventory/${resourceId}`),

  /**
   * Admin: Create/initialize inventory for resource
   */
  create: (resourceId, inventory) =>
    apiRequest(`/inventory/${resourceId}/create`, {
      method: "POST",
      body: JSON.stringify(inventory),
    }),

  /**
   * Admin: Update inventory quantities
   */
  update: (resourceId, quantities) =>
    apiRequest(`/inventory/${resourceId}/update`, {
      method: "PATCH",
      body: JSON.stringify(quantities),
    }),
};

// ============================================
// REPORTS API (Step 9 - Monitoring)
// ============================================

export const notificationAPI = {
  getAll: () => apiRequest("/notifications"),
  create: (notification) =>
    apiRequest("/notifications", {
      method: "POST",
      body: JSON.stringify(notification),
    }),
};

export const reportsAPI = {
  /**
   * Get dashboard overview/summary
   * Shows request stats, allocation count, distribution count, inventory levels
   */
  getDashboardOverview: (campus) => {
    const query = campus ? `?campus=${encodeURIComponent(campus)}` : "";
    return apiRequest(`/reports/overview${query}`);
  },

  /**
   * Get request workflow report
   * Shows request statistics, completion rates, approval rates
   */
  getRequestReport: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiRequest(`/reports/requests/workflow?${params.toString()}`);
  },

  /**
   * Get approval analytics
   * Shows staff approval/rejection rates and rejection reasons
   */
  getApprovalAnalytics: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiRequest(`/reports/requests/approval-analytics?${params.toString()}`);
  },

  /**
   * Get distribution report
   * Shows distribution statistics, average time to distribute, top resources
   */
  getDistributionReport: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiRequest(`/reports/distribution/detail?${params.toString()}`);
  },

  /**
   * Get resource demand report
   * Shows which resources are most requested
   */
  getResourceDemandReport: (campus) => {
    const query = campus ? `?campus=${encodeURIComponent(campus)}` : "";
    return apiRequest(`/reports/resources/demand${query}`);
  },

  /**
   * Get inventory report
   * Shows current inventory levels by resource
   */
  getInventoryReport: (campus) => {
    const query = campus ? `?campus=${encodeURIComponent(campus)}` : "";
    return apiRequest(`/reports/inventory/detail${query}`);
  },

  /**
   * Get audit log report
   * Shows complete action history with filters
   */
  getAuditLogReport: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiRequest(`/reports/audit-log?${params.toString()}`);
  },
};

// ============================================
// USER API
// ============================================

export const userAPI = {
  /**
   * Get all users (admin only)
   */
  getAll: () => 
    apiRequest("/users/all"),

  /**
   * Get current user profile
   */
  getMe: () =>
    apiRequest("/users/me"),

  /**
   * Update current user profile
   */
  updateMe: (details) =>
    apiRequest("/users/me", {
      method: "PATCH",
      body: JSON.stringify(details),
    }),

  /**
   * Update user status (admin only)
   */
  updateStatus: (userId, status) =>
    apiRequest(`/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /**
   * Delete user (admin only)
   */
  delete: (userId) =>
    apiRequest(`/users/${userId}`, {
      method: "DELETE",
    }),

  /**
   * Get users by role
   */
  getByRole: (role) =>
    apiRequest(`/users?role=${role}`),
};

// ============================================
// WORKFLOW HELPERS
// ============================================

/**
 * Complete request workflow helper
 * Chains together multiple API calls for a complete request flow
 */
export const workflowHelper = {
  /**
   * Get complete request status with related data
   */
  getRequestWithDetails: async (requestId) => {
    const request = await requestAPI.getById(requestId);
    // Could fetch related allocation, schedule, distribution here if needed
    return request;
  },

  /**
   * Get student dashboard data
   * Aggregates my requests, my schedules, etc.
   */
  getStudentDashboard: async () => {
    const [requests, schedules] = await Promise.all([
      requestAPI.getMyRequests().catch(() => ({ requests: [] })),
      distributionAPI.getMySchedules().catch(() => ({ schedules: [] })),
    ]);
    return { requests, schedules };
  },

  /**
   * Get staff dashboard data
   * Aggregates pending requests, schedules, distributions
   */
  getStaffDashboard: async (filters = {}) => {
    const requestStatus = filters.status || "pending";
    const [pending, scheduled, distributions] = await Promise.all([
      requestAPI.getByStatus(requestStatus).catch(() => ({ requests: [] })),
      distributionAPI.getAllSchedules().catch(() => ({ schedules: [] })),
      distributionAPI.getAll().catch(() => ({ distributions: [] })),
    ]);
    return { pending, scheduled, distributions };
  },

  /**
   * Get admin dashboard data
   * Aggregates all system data with reports
   */
  getAdminDashboard: async (campus) => {
    const [overview, inventory, approvalAnalytics] = await Promise.all([
      reportsAPI.getDashboardOverview(campus),
      reportsAPI.getInventoryReport(campus),
      reportsAPI.getApprovalAnalytics(),
    ]);
    return { overview, inventory, approvalAnalytics };
  },
};