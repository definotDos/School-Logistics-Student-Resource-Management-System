import { allocationAPI, reportsAPI, requestAPI, resourceAPI, userAPI } from "./api";

export const userRow = (user) => ({ databaseId: user.id, name: user.name,
  detail: `${user.email} · ${user.role} · ${user.campus}`, status: user.status,
  action: user.status === "suspended" ? "Restore" : "Suspend" });

export async function loadAdminSection(section) {
  switch (section) {
    case "dashboard": return { overview: await reportsAPI.getDashboardOverview() };
    case "requests": return { requests: (await requestAPI.getAll()).requests };
    case "users": return { rows: (await userAPI.getAll()).users.map(userRow) };
    case "catalog": return { rows: (await resourceAPI.getAll()).resources.map(resource => ({
      databaseId: resource._id, name: resource.name, detail: `${resource.category} · ${resource.campus}`,
      status: resource.status, action: "Edit",
    })) };
    case "allocation": {
      const [allocationResult, userResult] = await Promise.all([allocationAPI.getAll(), userAPI.getAll()]);
      return { staff: userResult.users.filter(user => user.role === "staff" && user.status === "active"),
        allocations: allocationResult.allocations.map(allocation => ({ databaseId: allocation._id,
          name: allocation.student?.studentId || allocation.student?._id,
          detail: `${allocation.student?.name || "Deleted student"} · ${allocation.resource?.name || "Deleted resource"} · ${allocation.quantity} unit(s)`,
          status: allocation.status, action: "View", assignedStaff: allocation.assignedStaff,
        })) };
    }
    case "audit": return { rows: (await reportsAPI.getAuditLogReport()).logs.map(log => ({
      databaseId: log._id, name: log.action,
      detail: `${log.actor} · ${log.entity} · ${new Date(log.timestamp).toLocaleString()}`,
      status: log.statusChange === "N/A" ? "Recorded" : log.statusChange, action: "View",
    })) };
    default: return {};
  }
}
