const studentLinks = [
  { name: "Dashboard", path: "/student", icon: "home" },
  { name: "Browse Resources", path: "/resources", icon: "resources" },
  { name: "My Requests", path: "/requests", icon: "requests" },
  { name: "Claim Schedule", path: "/claim-schedule", icon: "calendar" },
  {
    name: "Distribution History",
    path: "/distribution-history",
    icon: "history",
  },
];

const adminLinks = [
  { name: "Dashboard", path: "/admin", icon: "home" },
  { name: "Users", path: "/admin/users", icon: "users" },
  { name: "Resource Catalog", path: "/admin/catalog", icon: "catalog" },
  { name: "Inventory", path: "/admin/inventory", icon: "resources" },
  { name: "Requests", path: "/admin/requests", icon: "requests" },
  { name: "Allocation", path: "/admin/allocation", icon: "requests" },
  { name: "Distribution", path: "/admin/distribution", icon: "calendar" },
  { name: "Campuses", path: "/admin/campuses", icon: "school" },
  { name: "Reports", path: "/admin/reports", icon: "history" },
  { name: "Notifications", path: "/admin/notifications", icon: "notification" },
  { name: "Audit Logs", path: "/admin/audit", icon: "requests" },
  { name: "My Profile", path: "/admin/profile", icon: "profile" },
];

const staffLinks = [
  { name: "My Profile", path: "/staff/profile", icon: "profile" },
  { name: "Dashboard", path: "/staff", icon: "home" },
  { name: "Verify Eligibility", path: "/staff/verify_eligibility", icon: "users" },
  { name: "Review Requests", path: "/staff/review_requests", icon: "requests" },
  { name: "Approve/Reject", path: "/staff/approve_reject", icon: "requests" },
  { name: "Claim Schedules", path: "/staff/manage_schedules", icon: "calendar" },
  { name: "Verify Claims", path: "/staff/verify_claims", icon: "resources" },
  { name: "Monitor Distribution", path: "/staff/monitor_distribution", icon: "calendar" },
  { name: "Student History", path: "/staff/student_history", icon: "history" },
  { name: "Update Status", path: "/staff/update_status", icon: "requests" },
  { name: "Reports", path: "/staff/reports", icon: "history" },
  { name: "Notifications", path: "/staff/notifications", icon: "notification" },
];

export const navigationForRole = (role) => ({ student: studentLinks, staff: staffLinks, admin: adminLinks }[role] || []);
