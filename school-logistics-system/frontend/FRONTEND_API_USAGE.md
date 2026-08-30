# Frontend API Service Layer - Usage Guide

This document provides a complete guide to using the frontend API service layer for integrating with the School Logistics Resource Management System (SLSRMS) backend.

## Overview

The API service layer (`src/services/api.js`) is organized into 8 modules:

1. **authAPI** - User authentication (login, signup, logout)
2. **resourceAPI** - Resource catalog management
3. **requestAPI** - Student resource requests & verification
4. **allocationAPI** - Request allocation & scheduling
5. **distributionAPI** - Claim verification & resource release
6. **inventoryAPI** - Inventory management
7. **reportsAPI** - System reporting & monitoring
8. **userAPI** - User management
9. **workflowHelper** - Pre-built workflow compositions

---

## Authentication (Step 1)

### Login
```javascript
import { authAPI } from "@/services/api";

async function handleLogin(email, password) {
  try {
    const { token, user } = await authAPI.login({ email, password });
    
    // Store token and user
    localStorage.setItem("srmsToken", token);
    localStorage.setItem("srmsUser", JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error("Login failed:", error.message);
  }
}
```

### Signup
```javascript
async function handleSignup(details) {
  try {
    const response = await authAPI.signup({
      name: "John Student",
      email: "student@university.edu",
      password: "securePassword",
      role: "student",
      campus: "PHINMA University of Pangasinan",
      matricule: "2023-001"
    });
    
    return response;
  } catch (error) {
    console.error("Signup failed:", error.message);
  }
}
```

### Logout
```javascript
function handleLogout() {
  authAPI.logout();
  // Redirect to login
}
```

---

## Student Request Workflow (Steps 2-3)

### Step 2: Create Request
```javascript
import { requestAPI, resourceAPI } from "@/services/api";

async function submitRequest() {
  try {
    // Get available resources
    const { resources } = await resourceAPI.getAll();
    
    // Create request
    const { request } = await requestAPI.create({
      resource: resources[0]._id,
      quantity: 2,
      reason: "Required for academic work",
      size: "Medium"
    });
    
    console.log("Request created:", request);
    return request;
  } catch (error) {
    console.error("Request creation failed:", error.message);
  }
}
```

### Step 2: Check My Requests
```javascript
async function checkMyRequests() {
  try {
    const { requests } = await requestAPI.getMyRequests();
    
    console.log("My requests:", requests);
    requests.forEach(req => {
      console.log(`${req.resource.name} - Status: ${req.status}`);
    });
    
    return requests;
  } catch (error) {
    console.error("Failed to load requests:", error.message);
  }
}
```

### Step 3: Staff Verifies Eligibility
```javascript
// Staff dashboard
async function reviewPendingRequests() {
  try {
    const { requests } = await requestAPI.getByStatus("pending");
    return requests;
  } catch (error) {
    console.error("Failed to load pending requests:", error.message);
  }
}

async function verifyEligibility(requestId, eligible, notes) {
  try {
    const { request } = await requestAPI.verifyEligibility(requestId, {
      eligible,
      notes
    });
    
    console.log("Eligibility verified:", request);
    return request;
  } catch (error) {
    console.error("Verification failed:", error.message);
  }
}
```

### Step 3: Admin Approves/Rejects
```javascript
async function approveRequest(requestId, notes) {
  try {
    const { request } = await requestAPI.approve(requestId, { notes });
    console.log("Request approved:", request);
    return request;
  } catch (error) {
    console.error("Approval failed:", error.message);
  }
}

async function rejectRequest(requestId, rejectionReason) {
  try {
    const { request } = await requestAPI.reject(requestId, {
      rejectionReason
    });
    console.log("Request rejected:", request);
    return request;
  } catch (error) {
    console.error("Rejection failed:", error.message);
  }
}
```

---

## Allocation Workflow (Steps 4-5)

### Step 4: Admin Processes Allocation
```javascript
import { allocationAPI } from "@/services/api";

async function processAllocation(requestId) {
  try {
    const { allocation } = await allocationAPI.process(requestId, {
      campus: "PHINMA University of Pangasinan"
    });
    
    console.log("Allocation processed:", allocation);
    console.log("Inventory reserved for:", allocation.quantity);
    
    return allocation;
  } catch (error) {
    console.error("Allocation failed:", error.message);
  }
}
```

### Step 5: Staff Creates Claim Schedule
```javascript
async function createSchedule(allocationId) {
  try {
    const schedule = await allocationAPI.createSchedule(allocationId, {
      pickupDate: "2024-01-18",
      startTime: "09:00",
      endTime: "11:00",
      location: "Main Campus Supply Office - Room 101"
    });
    
    console.log("Schedule created:", schedule);
    // Student notified automatically
    
    return schedule;
  } catch (error) {
    console.error("Schedule creation failed:", error.message);
  }
}
```

### Get Allocations
```javascript
async function viewMyAllocations() {
  try {
    const { allocations } = await allocationAPI.getMine();
    return allocations;
  } catch (error) {
    console.error("Failed to load allocations:", error.message);
  }
}

async function getAllAllocations(status) {
  try {
    const { allocations } = await allocationAPI.getByStatus(status);
    // Status: Reserved, Scheduled, Verified, Released
    return allocations;
  } catch (error) {
    console.error("Failed to load allocations:", error.message);
  }
}
```

---

## Distribution Workflow (Steps 6-8)

### Step 6: Student Views Schedules
```javascript
import { distributionAPI } from "@/services/api";

async function viewMyPickupSchedules() {
  try {
    const { schedules } = await distributionAPI.getMySchedules();
    
    schedules.forEach(schedule => {
      console.log(`
        Resource: ${schedule.resource.name}
        Date: ${schedule.pickupDate}
        Time: ${schedule.startTime} - ${schedule.endTime}
        Location: ${schedule.location}
        Status: ${schedule.status}
      `);
    });
    
    return schedules;
  } catch (error) {
    console.error("Failed to load schedules:", error.message);
  }
}
```

### Step 7: Staff Verifies Identity
```javascript
async function verifyStudentAtPickup(scheduleId) {
  try {
    const { claimSchedule } = await distributionAPI.verifyClaimIdentity(
      scheduleId,
      {
        verificationDetails: "ID verified - Student ID: 2023-001",
        quantityClaimed: 2
      }
    );
    
    console.log("Student verified:", claimSchedule);
    return claimSchedule;
  } catch (error) {
    console.error("Verification failed:", error.message);
  }
}
```

### Step 8: Staff Releases Resource
```javascript
async function releaseResourceToStudent(allocationId) {
  try {
    const { distribution } = await distributionAPI.release(
      allocationId,
      {
        quantityDelivered: 2,
        distributionLocation: "Main Campus Supply Office - Room 101"
      }
    );
    
    console.log("Resource released:", distribution);
    console.log("Reference ID:", distribution.referenceId);
    // Student notified automatically
    
    return distribution;
  } catch (error) {
    console.error("Release failed:", error.message);
  }
}
```

### Get Distributions
```javascript
async function viewDistributions(status) {
  try {
    // Status: Pending, Prepared, Released, Received, Completed
    const { distributions } = await distributionAPI.getByStatus(status);
    return distributions;
  } catch (error) {
    console.error("Failed to load distributions:", error.message);
  }
}
```

---

## Reports API (Step 9 - Monitoring)

### Dashboard Overview
```javascript
import { reportsAPI } from "@/services/api";

async function loadDashboard(campus = null) {
  try {
    const overview = await reportsAPI.getDashboardOverview(campus);
    
    console.log(`
      Total Requests: ${overview.requests.total}
      - Pending: ${overview.requests.pending}
      - Approved: ${overview.requests.approved}
      - Completed: ${overview.requests.completed}
      
      Completion Rate: ${overview.requests.completionRate}%
      Approval Rate: ${overview.requests.approvalRate}%
      
      Inventory:
      - Available: ${overview.inventory.available}
      - Reserved: ${overview.inventory.reserved}
      - Issued: ${overview.inventory.issued}
    `);
    
    return overview;
  } catch (error) {
    console.error("Failed to load dashboard:", error.message);
  }
}
```

### Request Report
```javascript
async function getRequestStatistics() {
  try {
    const report = await reportsAPI.getRequestReport({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      campus: "PHINMA University of Pangasinan"
    });
    
    console.log("Request Statistics:", report);
    console.log("Completion Rate:", report.completionRate, "%");
    console.log("Approval Rate:", report.approvalRate, "%");
    
    return report;
  } catch (error) {
    console.error("Failed to load report:", error.message);
  }
}
```

### Approval Analytics
```javascript
async function analyzeApprovals() {
  try {
    const analytics = await reportsAPI.getApprovalAnalytics({
      startDate: "2024-01-01",
      endDate: "2024-01-31"
    });
    
    console.log("Total Approved:", analytics.summary.totalApproved);
    console.log("Total Rejected:", analytics.summary.totalRejected);
    console.log("Approval Rate:", analytics.summary.approvalRate, "%");
    
    console.log("Approvals by Staff:");
    analytics.approvalsByStaff.forEach(staff => {
      console.log(`- ${staff.name}: ${staff.count} approvals`);
    });
    
    console.log("Top Rejection Reasons:");
    analytics.topRejectionReasons.forEach(reason => {
      console.log(`- ${reason.reason}: ${reason.count}`);
    });
    
    return analytics;
  } catch (error) {
    console.error("Failed to load analytics:", error.message);
  }
}
```

### Distribution Report
```javascript
async function getDistributionStats() {
  try {
    const report = await reportsAPI.getDistributionReport({
      startDate: "2024-01-01",
      endDate: "2024-01-31"
    });
    
    console.log("Total Distributed:", report.summary.totalDistributed);
    console.log("Average Time to Distribute:", report.summary.averageTimeToDistribute, "days");
    
    console.log("Top Resources:");
    report.topDistributedResources.slice(0, 5).forEach(resource => {
      console.log(`- ${resource.name}: ${resource.quantity} units`);
    });
    
    return report;
  } catch (error) {
    console.error("Failed to load distribution report:", error.message);
  }
}
```

### Resource Demand Report
```javascript
async function analyzeResourceDemand() {
  try {
    const report = await reportsAPI.getResourceDemandReport(
      "PHINMA University of Pangasinan"
    );
    
    console.log("Total Resources:", report.summary.totalResources);
    console.log("Total Demand:", report.summary.totalDemand);
    
    console.log("Top Demanded Resources:");
    report.topDemandedResources.forEach(resource => {
      console.log(`
        ${resource.name}
        Total: ${resource.total}
        Approved: ${resource.approved}
        Rejected: ${resource.rejected}
        Completed: ${resource.completed}
      `);
    });
    
    return report;
  } catch (error) {
    console.error("Failed to load demand report:", error.message);
  }
}
```

### Inventory Report
```javascript
async function checkInventoryLevels(campus = null) {
  try {
    const report = await reportsAPI.getInventoryReport(campus);
    
    console.log("Total Resources:", report.summary.totalResources);
    console.log("Available Units:", report.summary.totalAvailable);
    console.log("Reserved Units:", report.summary.totalReserved);
    console.log("Issued Units:", report.summary.totalIssued);
    
    console.log("Inventory by Resource:");
    report.details.forEach(inv => {
      console.log(`
        ${inv.resourceName}
        Available: ${inv.available}
        Reserved: ${inv.reserved}
        Issued: ${inv.issued}
        Total: ${inv.total}
      `);
    });
    
    return report;
  } catch (error) {
    console.error("Failed to load inventory report:", error.message);
  }
}
```

### Audit Log Report
```javascript
async function viewAuditTrail() {
  try {
    const report = await reportsAPI.getAuditLogReport({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      entity: "Request"
    });
    
    console.log("Total Actions:", report.summary.totalLogs);
    
    report.logs.forEach(log => {
      console.log(`
        ${log.timestamp}
        ${log.actor} (${log.role})
        Action: ${log.action}
        Status: ${log.statusChange}
      `);
    });
    
    return report;
  } catch (error) {
    console.error("Failed to load audit log:", error.message);
  }
}
```

---

## Workflow Helpers

Pre-built composition functions for common workflows:

### Student Dashboard
```javascript
import { workflowHelper } from "@/services/api";

async function loadStudentDashboard() {
  try {
    const { requests, schedules } = await workflowHelper.getStudentDashboard();
    
    console.log("My Requests:", requests.requests);
    console.log("My Pickup Schedules:", schedules.schedules);
    
    return { requests, schedules };
  } catch (error) {
    console.error("Failed to load dashboard:", error.message);
  }
}
```

### Staff Dashboard
```javascript
async function loadStaffDashboard() {
  try {
    const { pending, scheduled, distributions } = await workflowHelper.getStaffDashboard();
    
    console.log("Pending Requests:", pending.requests);
    console.log("Scheduled Pickups:", scheduled.schedules);
    console.log("Distributions:", distributions.distributions);
    
    return { pending, scheduled, distributions };
  } catch (error) {
    console.error("Failed to load dashboard:", error.message);
  }
}
```

### Admin Dashboard
```javascript
async function loadAdminDashboard(campus = null) {
  try {
    const { overview, inventory, approvalAnalytics } = 
      await workflowHelper.getAdminDashboard(campus);
    
    console.log("System Overview:", overview);
    console.log("Inventory Status:", inventory);
    console.log("Approval Analytics:", approvalAnalytics);
    
    return { overview, inventory, approvalAnalytics };
  } catch (error) {
    console.error("Failed to load dashboard:", error.message);
  }
}
```

---

## Inventory Management

### Get All Inventory
```javascript
import { inventoryAPI } from "@/services/api";

async function checkInventory() {
  try {
    const { inventory } = await inventoryAPI.getAll();
    
    inventory.forEach(inv => {
      console.log(`
        ${inv.resource.name}
        Available: ${inv.available}
        Reserved: ${inv.reserved}
        Issued: ${inv.issued}
      `);
    });
    
    return inventory;
  } catch (error) {
    console.error("Failed to load inventory:", error.message);
  }
}
```

### Admin: Create Inventory
```javascript
async function initializeInventory(resourceId, quantity) {
  try {
    const { inventory } = await inventoryAPI.create(resourceId, {
      available: quantity,
      reserved: 0,
      issued: 0
    });
    
    console.log("Inventory created:", inventory);
    return inventory;
  } catch (error) {
    console.error("Failed to create inventory:", error.message);
  }
}
```

### Admin: Update Inventory
```javascript
async function updateInventoryQuantities(resourceId, available, reserved, issued) {
  try {
    const { inventory } = await inventoryAPI.update(resourceId, {
      available,
      reserved,
      issued
    });
    
    console.log("Inventory updated:", inventory);
    return inventory;
  } catch (error) {
    console.error("Failed to update inventory:", error.message);
  }
}
```

---

## User Management

### Get Current User Profile
```javascript
import { userAPI } from "@/services/api";

async function loadMyProfile() {
  try {
    const { user } = await userAPI.getMe();
    return user;
  } catch (error) {
    console.error("Failed to load profile:", error.message);
  }
}
```

### Update Profile
```javascript
async function updateProfile(updates) {
  try {
    const { user } = await userAPI.updateMe(updates);
    return user;
  } catch (error) {
    console.error("Failed to update profile:", error.message);
  }
}
```

### Admin: Manage Users
```javascript
async function getAllUsers() {
  try {
    const { users } = await userAPI.getAll();
    return users;
  } catch (error) {
    console.error("Failed to load users:", error.message);
  }
}

async function changeUserStatus(userId, status) {
  try {
    const { user } = await userAPI.updateStatus(userId, status);
    return user;
  } catch (error) {
    console.error("Failed to update user status:", error.message);
  }
}
```

---

## Error Handling

All API calls throw errors that should be caught:

```javascript
try {
  const response = await requestAPI.create({ /* ... */ });
} catch (error) {
  console.error("Error:", error.message);
  
  // Common error scenarios:
  // "You already have an active request for this resource..."
  // "Insufficient inventory..."
  // "Only admin can approve requests"
  // "Request not found"
  // "Unable to connect to the server..."
}
```

---

## Complete Example: Full Request Workflow

```javascript
import { 
  authAPI, 
  requestAPI, 
  allocationAPI, 
  distributionAPI,
  reportsAPI 
} from "@/services/api";

async function completeRequestWorkflow() {
  try {
    // Step 1: Login
    const user = await authAPI.login({
      email: "student@university.edu",
      password: "password123"
    });
    console.log("✓ Logged in as:", user.name);

    // Step 2: Create Request
    const { request } = await requestAPI.create({
      resource: "607f1f77bcf86cd799439012",
      quantity: 2,
      reason: "Required for class"
    });
    console.log("✓ Request created:", request._id);

    // Step 3: Wait for staff approval (simulated)
    let approved = false;
    while (!approved) {
      const { requests } = await requestAPI.getMyRequests();
      if (requests[0].status === "approved") {
        approved = true;
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
    }
    console.log("✓ Request approved by staff");

    // Step 4: Wait for admin allocation
    let allocated = false;
    while (!allocated) {
      const { allocations } = await allocationAPI.getMine();
      if (allocations.length > 0) {
        allocated = true;
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    console.log("✓ Allocation processed by admin");

    // Step 5: Wait for pickup schedule
    let scheduled = false;
    while (!scheduled) {
      const { schedules } = await distributionAPI.getMySchedules();
      if (schedules.length > 0) {
        scheduled = true;
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    console.log("✓ Pickup scheduled by staff");

    // Step 6: View schedule
    const { schedules } = await distributionAPI.getMySchedules();
    console.log("✓ Pickup scheduled for:", schedules[0].pickupDate);

    // Steps 7-8: Wait for pickup (staff will verify & release)
    // This would happen at the physical location
    console.log("✓ Complete - Resource collected!");

    // Step 9: Check reports
    const dashboard = await reportsAPI.getDashboardOverview();
    console.log("✓ System stats - Completed:", dashboard.requests.completed);

  } catch (error) {
    console.error("Workflow failed:", error.message);
  }
}
```

---

## Configuration

Environment variables:
```env
VITE_API_URL=http://localhost:5000/api
```

The API service automatically:
- Manages JWT token storage
- Includes token in all requests
- Handles JSON serialization/deserialization
- Provides consistent error messages

---

## Summary

This API service layer provides everything needed to integrate the 9-step resource management workflow into the frontend application. Simply import the relevant API modules and call the functions as shown in the examples above.
