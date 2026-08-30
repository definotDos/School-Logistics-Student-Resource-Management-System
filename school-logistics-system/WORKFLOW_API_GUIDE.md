# School Logistics Resource Management System (SLSRMS) - API Workflow Guide

## Overview
This document provides a complete guide to the 9-step resource management workflow in SLSRMS, including API endpoints, request/response examples, status transitions, and error handling.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Complete 9-Step Workflow](#complete-9-step-workflow)
3. [Step-by-Step API Sequences](#step-by-step-api-sequences)
4. [Status Transitions](#status-transitions)
5. [Error Handling](#error-handling)
6. [Example Workflows](#example-workflows)

---

## Authentication

All API endpoints (except `/api/auth`) require a valid JWT token in the Authorization header.

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "user123",
    "name": "John Student",
    "email": "student@university.edu",
    "role": "student",
    "campus": "PHINMA University of Pangasinan"
  }
}
```

### All Subsequent Requests
```
Authorization: Bearer {token}
```

---

## Complete 9-Step Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  SCHOOL LOGISTICS RESOURCE MANAGEMENT                   │
│                           9-STEP WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: User Login (Role-based)
├─ Student logs in
├─ Staff logs in
└─ Admin logs in

Step 2: Student Requests Resource
├─ Student submits resource request (quantity, resource type)
├─ System checks for duplicate active requests
└─ Request created in "pending" status

Step 3: Student Affairs Verifies Eligibility
├─ Staff reviews request
├─ Verifies eligibility (grade, campus, criteria)
└─ Request status: "pending" → "approved" OR "rejected"

Step 4: Admin/System Processes Approval & Reserves Resource
├─ Admin processes approved request
├─ Inventory reserved (available → reserved)
├─ Allocation created in "Reserved" status
└─ Request status: "approved" → (stays approved, awaiting schedule)

Step 5: Logistics Staff Prepares & Assigns Claim Schedule
├─ Staff creates claim schedule (date, time, location)
├─ Allocation status: "Reserved" → "Scheduled"
├─ Request status: "approved" → "ready_for_claim"
└─ Student receives notification with schedule details

Step 6: Student Receives Notification
├─ Student gets SMS/Email with claim schedule
├─ Student views schedule in their dashboard
└─ Student confirms attendance (optional)

Step 7: Staff Verifies Student Identity at Claim
├─ Staff verifies student identity on claim date
├─ ClaimSchedule status: "Scheduled" → "Confirmed"
└─ Request status: "ready_for_claim" → "claimed"

Step 8: Distribution Completed & Inventory Updated
├─ Staff releases resource to student
├─ Inventory: reserved → issued
├─ Allocation status: "Scheduled" → "Released"
├─ Distribution record created
├─ Request status: "claimed" → "released" → "completed"
└─ Student receives release notification

Step 9: Reports & Monitoring
├─ Admin/Staff view comprehensive reports
├─ Track pending/completed requests
├─ Monitor inventory levels
├─ View approval statistics
├─ Generate audit logs
└─ Resource demand analysis
```

---

## Step-by-Step API Sequences

### STEP 1: User Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "student@university.edu",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Student",
    "email": "student@university.edu",
    "role": "student",
    "campus": "PHINMA University of Pangasinan",
    "matricule": "2023-001"
  }
}
```

**Response (401):**
```json
{
  "message": "Invalid credentials"
}
```

---

### STEP 2: Student Requests Resource

**Endpoint:** `POST /api/requests`

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "resource": "507f1f77bcf86cd799439012",
  "quantity": 2,
  "reason": "Required for academic work",
  "size": "Medium"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Request created successfully",
  "request": {
    "_id": "507f1f77bcf86cd799439013",
    "student": "507f1f77bcf86cd799439011",
    "resource": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "School Uniform",
      "category": "Uniform",
      "campus": "PHINMA University of Pangasinan"
    },
    "quantity": 2,
    "size": "Medium",
    "reason": "Required for academic work",
    "status": "pending",
    "eligibilityStatus": "pending",
    "priority": "normal",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response (400 - Duplicate Request):**
```json
{
  "message": "You already have an active request for this resource. Please wait for approval or cancellation."
}
```

---

### STEP 3: Student Affairs Verifies Eligibility

**Get Pending Requests (Staff):**

**Endpoint:** `GET /api/requests/status/pending`

**Headers:**
```
Authorization: Bearer {staffToken}
```

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "requests": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "student": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Student",
        "email": "student@university.edu",
        "matricule": "2023-001"
      },
      "resource": "School Uniform",
      "quantity": 2,
      "reason": "Required for academic work",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Verify Eligibility:**

**Endpoint:** `POST /api/requests/{requestId}/verify-eligibility`

**Request:**
```json
{
  "eligible": true,
  "notes": "Student meets all requirements"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Eligibility verified",
  "request": {
    "_id": "507f1f77bcf86cd799439013",
    "status": "pending",
    "eligibilityStatus": "eligible",
    "eligibilityChecked": true,
    "checkedBy": "507f1f77bcf86cd799439021",
    "checkedAt": "2024-01-15T11:00:00Z",
    "notes": "Student meets all requirements"
  }
}
```

**OR Approve Request:**

**Endpoint:** `POST /api/requests/{requestId}/approve`

**Request:**
```json
{
  "notes": "Approved - meets all criteria"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Request approved",
  "request": {
    "_id": "507f1f77bcf86cd799439013",
    "status": "approved",
    "eligibilityStatus": "eligible",
    "approvedBy": "507f1f77bcf86cd799439021",
    "approvedAt": "2024-01-15T11:05:00Z"
  }
}
```

**OR Reject Request:**

**Endpoint:** `POST /api/requests/{requestId}/reject`

**Request:**
```json
{
  "rejectionReason": "Student does not meet eligibility criteria"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Request rejected",
  "request": {
    "_id": "507f1f77bcf86cd799439013",
    "status": "rejected",
    "rejectedBy": "507f1f77bcf86cd799439021",
    "rejectedAt": "2024-01-15T11:05:00Z",
    "rejectionReason": "Student does not meet eligibility criteria"
  }
}
```

---

### STEP 4: Admin Processes Approval & Reserves Resource

**Endpoint:** `POST /api/allocations/{requestId}/process`

**Headers:**
```
Authorization: Bearer {adminToken}
```

**Request:**
```json
{
  "campus": "PHINMA University of Pangasinan"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Allocation processed successfully",
  "allocation": {
    "_id": "507f1f77bcf86cd799439014",
    "request": "507f1f77bcf86cd799439013",
    "student": "507f1f77bcf86cd799439011",
    "resource": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "School Uniform"
    },
    "quantity": 2,
    "status": "Reserved",
    "campus": "PHINMA University of Pangasinan",
    "allocatedBy": "507f1f77bcf86cd799439021",
    "allocationDate": "2024-01-15T11:10:00Z"
  }
}
```

**Inventory Updated:**
```
Before: { available: 45, reserved: 0, issued: 0 }
After:  { available: 43, reserved: 2, issued: 0 }
```

---

### STEP 5: Logistics Staff Creates Claim Schedule

**Endpoint:** `POST /api/allocations/{allocationId}/schedule`

**Headers:**
```
Authorization: Bearer {staffToken}
```

**Request:**
```json
{
  "pickupDate": "2024-01-18",
  "startTime": "09:00",
  "endTime": "11:00",
  "location": "Main Campus Supply Office - Room 101"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Claim schedule created successfully",
  "allocation": {
    "_id": "507f1f77bcf86cd799439014",
    "status": "Scheduled",
    "scheduledDate": "2024-01-18T09:00:00Z"
  },
  "claimSchedule": {
    "_id": "507f1f77bcf86cd799439015",
    "allocation": "507f1f77bcf86cd799439014",
    "pickupDate": "2024-01-18",
    "startTime": "09:00",
    "endTime": "11:00",
    "location": "Main Campus Supply Office - Room 101",
    "status": "Scheduled"
  },
  "notification": {
    "message": "Your resource is ready for pickup on 18 January 2024 from 09:00 to 11:00 at Main Campus Supply Office - Room 101",
    "sent": true
  }
}
```

**Request Status Updated:** `approved` → `ready_for_claim`

---

### STEP 6: Student Receives Notification

**Get My Schedules (Student):**

**Endpoint:** `GET /api/distribution/schedules/my`

**Headers:**
```
Authorization: Bearer {studentToken}
```

**Response (200):**
```json
{
  "success": true,
  "count": 1,
  "schedules": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "resource": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "School Uniform"
      },
      "quantity": 2,
      "pickupDate": "2024-01-18",
      "startTime": "09:00",
      "endTime": "11:00",
      "location": "Main Campus Supply Office - Room 101",
      "status": "Scheduled"
    }
  ]
}
```

---

### STEP 7: Staff Verifies Student Identity at Claim

**Endpoint:** `POST /api/distribution/schedules/{scheduleId}/verify`

**Headers:**
```
Authorization: Bearer {staffToken}
```

**Request:**
```json
{
  "verificationDetails": "ID verified - Student ID: 2023-001",
  "quantityClaimed": 2
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Student identity verified",
  "claimSchedule": {
    "_id": "507f1f77bcf86cd799439015",
    "status": "Confirmed",
    "verifiedBy": "507f1f77bcf86cd799439021",
    "verifiedAt": "2024-01-18T09:30:00Z",
    "quantityClaimed": 2,
    "verificationDetails": "ID verified - Student ID: 2023-001"
  },
  "request": {
    "_id": "507f1f77bcf86cd799439013",
    "status": "claimed"
  }
}
```

---

### STEP 8: Distribution Completed & Inventory Updated

**Endpoint:** `POST /api/distribution/allocations/{allocationId}/release`

**Headers:**
```
Authorization: Bearer {staffToken}
```

**Request:**
```json
{
  "quantityDelivered": 2,
  "distributionLocation": "Main Campus Supply Office - Room 101"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Resource released successfully",
  "distribution": {
    "_id": "507f1f77bcf86cd799439016",
    "referenceId": "DIST-1705329000000-a1b2c3",
    "allocation": "507f1f77bcf86cd799439014",
    "request": "507f1f77bcf86cd799439013",
    "student": "507f1f77bcf86cd799439011",
    "resource": "School Uniform",
    "status": "Released",
    "quantityRequested": 2,
    "quantityDelivered": 2,
    "releasedBy": "507f1f77bcf86cd799439021",
    "releasedAt": "2024-01-18T09:45:00Z"
  },
  "allocation": {
    "_id": "507f1f77bcf86cd799439014",
    "status": "Released",
    "releasedDate": "2024-01-18T09:45:00Z"
  },
  "request": {
    "_id": "507f1f77bcf86cd799439013",
    "status": "released"
  },
  "inventory": {
    "available": 43,
    "reserved": 0,
    "issued": 2
  }
}
```

**Inventory Updated:**
```
Before: { available: 43, reserved: 2, issued: 0 }
After:  { available: 43, reserved: 0, issued: 2 }
```

**Request Status Updated:** `claimed` → `released` → `completed`

---

### STEP 9: Reports & Monitoring

**Get Dashboard Overview:**

**Endpoint:** `GET /api/reports/overview`

**Query Parameters (Optional):**
```
?campus=PHINMA University of Pangasinan
```

**Response (200):**
```json
{
  "generatedAt": "2024-01-18T10:00:00Z",
  "campus": "All Campuses",
  "requests": {
    "total": 50,
    "pending": 5,
    "approved": 15,
    "rejected": 2,
    "completed": 28,
    "completionRate": 56,
    "approvalRate": 34
  },
  "allocations": {
    "total": 15
  },
  "distributions": {
    "total": 28
  },
  "inventory": {
    "available": 200,
    "reserved": 15,
    "issued": 35
  }
}
```

**Get Request Report:**

**Endpoint:** `GET /api/reports/requests/workflow`

**Query Parameters:**
```
?startDate=2024-01-01&endDate=2024-01-31&campus=PHINMA University of Pangasinan&status=completed
```

**Response (200):**
```json
{
  "generatedAt": "2024-01-18T10:00:00Z",
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "filters": {
    "campus": "PHINMA University of Pangasinan",
    "status": "completed"
  },
  "summary": {
    "totalRequests": 28,
    "pending": 0,
    "approved": 0,
    "rejected": 0,
    "readyForClaim": 0,
    "claimed": 0,
    "released": 0,
    "completed": 28
  },
  "approvalRate": 100,
  "rejectionRate": 0,
  "completionRate": 100
}
```

**Get Approval Analytics:**

**Endpoint:** `GET /api/reports/requests/approval-analytics`

**Query Parameters:**
```
?startDate=2024-01-01&endDate=2024-01-31
```

**Response (200):**
```json
{
  "generatedAt": "2024-01-18T10:00:00Z",
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "campus": "All",
  "summary": {
    "totalApproved": 42,
    "totalRejected": 8,
    "approvalRate": 84
  },
  "approvalsByStaff": [
    {
      "name": "Jane Staff",
      "count": 25
    },
    {
      "name": "John Staff",
      "count": 17
    }
  ],
  "rejectionsByStaff": [
    {
      "name": "Jane Staff",
      "count": 5
    },
    {
      "name": "John Staff",
      "count": 3
    }
  ],
  "topRejectionReasons": [
    {
      "reason": "Student does not meet eligibility criteria",
      "count": 5
    },
    {
      "reason": "Insufficient inventory",
      "count": 3
    }
  ]
}
```

**Get Distribution Report:**

**Endpoint:** `GET /api/reports/distribution/detail`

**Response (200):**
```json
{
  "generatedAt": "2024-01-18T10:00:00Z",
  "period": {
    "startDate": "All",
    "endDate": "All"
  },
  "campus": "All",
  "summary": {
    "totalDistributed": 28,
    "totalQuantity": 56,
    "averageTimeToDistribute": 3
  },
  "byStatus": {
    "released": 0,
    "received": 0,
    "completed": 28
  },
  "topDistributedResources": [
    {
      "name": "School Uniform",
      "quantity": 45
    },
    {
      "name": "School Shoes",
      "quantity": 11
    }
  ],
  "distributionsByStaff": [
    {
      "name": "Jane Staff",
      "count": 16
    },
    {
      "name": "John Staff",
      "count": 12
    }
  ]
}
```

**Get Resource Demand Report:**

**Endpoint:** `GET /api/reports/resources/demand`

**Response (200):**
```json
{
  "generatedAt": "2024-01-18T10:00:00Z",
  "campus": "All",
  "summary": {
    "totalResources": 5,
    "totalDemand": 150
  },
  "topDemandedResources": [
    {
      "name": "School Uniform",
      "total": 60,
      "approved": 45,
      "rejected": 3,
      "pending": 5,
      "completed": 7
    },
    {
      "name": "School Shoes",
      "total": 40,
      "approved": 28,
      "rejected": 2,
      "pending": 3,
      "completed": 7
    }
  ]
}
```

**Get Inventory Report:**

**Endpoint:** `GET /api/reports/inventory/detail`

**Response (200):**
```json
{
  "generatedAt": "2024-01-18T10:00:00Z",
  "campus": "All Campuses",
  "summary": {
    "totalResources": 5,
    "totalAvailable": 200,
    "totalReserved": 15,
    "totalIssued": 35
  },
  "details": [
    {
      "resourceId": "507f1f77bcf86cd799439012",
      "resourceName": "School Uniform",
      "category": "Uniform",
      "available": 120,
      "reserved": 5,
      "issued": 8,
      "total": 133,
      "status": "Available"
    }
  ]
}
```

**Get Audit Log Report:**

**Endpoint:** `GET /api/reports/audit-log`

**Query Parameters:**
```
?startDate=2024-01-01&endDate=2024-01-31&action=request_created&entity=Request
```

**Response (200):**
```json
{
  "generatedAt": "2024-01-18T10:00:00Z",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "action": "request_created",
    "entity": "Request"
  },
  "summary": {
    "totalLogs": 50,
    "uniqueActors": 42,
    "uniqueActions": 12
  },
  "logs": [
    {
      "timestamp": "2024-01-18T09:00:00Z",
      "actor": "John Student",
      "role": "student",
      "action": "request_created",
      "entity": "Request",
      "entityId": "507f1f77bcf86cd799439013",
      "details": "Student submitted resource request",
      "statusChange": "N/A"
    },
    {
      "timestamp": "2024-01-18T10:00:00Z",
      "actor": "Jane Staff",
      "role": "staff",
      "action": "eligibility_verified",
      "entity": "Request",
      "entityId": "507f1f77bcf86cd799439013",
      "details": "Eligibility check completed",
      "statusChange": "pending → eligible"
    }
  ]
}
```

---

## Status Transitions

### Request Statuses
```
pending
  ├─ (Staff verifies eligibility)
  ├─→ approved
  │   ├─ (Admin processes allocation)
  │   ├─→ ready_for_claim
  │   │   ├─ (Staff schedules pickup)
  │   │   ├─→ claimed
  │   │       ├─ (Staff releases resource)
  │   │       ├─→ released
  │   │           ├─→ completed
  │   │
  └─→ rejected
```

### Allocation Statuses
```
Reserved (after approval)
  ├─ (Staff creates schedule)
  ├─→ Scheduled
      ├─ (Staff verifies identity)
      ├─→ Verified
          ├─ (Staff releases resource)
          ├─→ Released
```

### ClaimSchedule Statuses
```
Scheduled
  ├─ (Staff verifies identity)
  ├─→ Confirmed
      ├─→ Completed
  │
  └─→ NoShow
  │
  └─→ Cancelled
```

### Distribution Statuses
```
Pending (auto-created when allocated)
  ├─ (Staff prepares)
  ├─→ Prepared
      ├─ (Staff releases)
      ├─→ Released
          ├─ (Student receives)
          ├─→ Received
              ├─→ Completed
```

### Inventory Statuses
```
available → reserved (on approval)
reserved → issued (on release)
```

---

## Error Handling

### Common Errors

**400 Bad Request - Duplicate Request:**
```json
{
  "message": "You already have an active request for this resource. Please wait for approval or cancellation."
}
```

**400 Bad Request - Invalid Status Transition:**
```json
{
  "message": "Request status cannot be changed from rejected to approved"
}
```

**400 Bad Request - Insufficient Inventory:**
```json
{
  "message": "Insufficient inventory. Available: 5, Requested: 10"
}
```

**401 Unauthorized:**
```json
{
  "message": "No authentication token provided"
}
```

**403 Forbidden:**
```json
{
  "message": "Only admin can approve requests"
}
```

**404 Not Found:**
```json
{
  "message": "Request not found"
}
```

**500 Internal Server Error:**
```json
{
  "message": "Unable to process request",
  "error": "Database connection error"
}
```

---

## Example Workflows

### Complete Student Request Flow (Happy Path)

```bash
# 1. Student Login
POST /api/auth/login
→ Receive token

# 2. Get Available Resources
GET /api/resources

# 3. Create Request
POST /api/requests
Body: { resource: "507f1f77bcf86cd799439012", quantity: 2 }
→ Request created with status: "pending"

# 4. Wait for Verification (Staff Action)
# Staff: GET /api/requests/status/pending
# Staff: POST /api/requests/{id}/verify-eligibility
# Staff: POST /api/requests/{id}/approve
→ Request status: "approved"

# 5. Wait for Allocation Processing (Admin Action)
# Admin: POST /api/allocations/{requestId}/process
→ Allocation created, Inventory reserved

# 6. Wait for Schedule Creation (Staff Action)
# Staff: POST /api/allocations/{allocationId}/schedule
→ Student notified
→ Request status: "ready_for_claim"

# 7. View Schedule (Student)
GET /api/distribution/schedules/my
→ Student sees pickup date/time/location

# 8. Claim Day - Staff Verifies (Staff Action)
# Staff: POST /api/distribution/schedules/{scheduleId}/verify
→ ClaimSchedule status: "Confirmed"
→ Request status: "claimed"

# 9. Release Resource (Staff Action)
# Staff: POST /api/distribution/allocations/{allocationId}/release
→ Distribution created
→ Inventory issued
→ Request status: "completed"

# 10. Student Notification
# Student receives: "Your resource has been released"
```

### Staff Approval Workflow

```bash
# Login as Staff
POST /api/auth/login
Body: { email: "staff@university.edu", password: "..." }
→ Receive staff token

# Get Pending Requests
GET /api/requests/status/pending
Authorization: Bearer {staffToken}
→ See list of pending requests

# For each request, verify eligibility
POST /api/requests/{requestId}/verify-eligibility
Body: { eligible: true, notes: "Meets criteria" }
→ Eligibility checked

# Approve if eligible
POST /api/requests/{requestId}/approve
Body: { notes: "Approved" }
→ Request status: "approved"

# OR Reject if not eligible
POST /api/requests/{requestId}/reject
Body: { rejectionReason: "Does not meet criteria" }
→ Request status: "rejected"
```

### Admin Processing Workflow

```bash
# Login as Admin
POST /api/auth/login
Body: { email: "admin@university.edu", password: "..." }
→ Receive admin token

# Get All Approved Requests
GET /api/requests/status/approved
Authorization: Bearer {adminToken}

# Process each allocation
POST /api/allocations/{requestId}/process
Body: { campus: "PHINMA University of Pangasinan" }
→ Allocation created
→ Inventory reserved

# View dashboard
GET /api/reports/overview
→ See system status
```

### Admin Reporting Workflow

```bash
# Login as Admin
POST /api/auth/login

# Get Dashboard Overview
GET /api/reports/overview
→ High-level system summary

# Get Detailed Request Report
GET /api/reports/requests/workflow?startDate=2024-01-01&endDate=2024-01-31
→ Request statistics for period

# Get Approval Analytics
GET /api/reports/requests/approval-analytics
→ Which staff approved/rejected and why

# Get Distribution Report
GET /api/reports/distribution/detail
→ Completed distributions and times

# Get Inventory Report
GET /api/reports/inventory/detail
→ Current inventory levels

# Get Resource Demand
GET /api/reports/resources/demand
→ Which resources are most requested

# Get Audit Log
GET /api/reports/audit-log?action=request_approved
→ Complete audit trail of approvals
```

---

## Data Model Relationships

```
Student (User)
  ├─ has many Requests
  ├─ has many Allocations (through Request)
  ├─ has many ClaimSchedules (through Allocation)
  └─ has many Distributions (through Allocation)

Request
  ├─ belongs to Student
  ├─ belongs to Resource
  ├─ has one Allocation
  ├─ has one ClaimSchedule (through Allocation)
  ├─ has one Distribution (through Allocation)
  └─ belongs to approvedBy/rejectedBy/claimedBy (Staff)

Allocation
  ├─ belongs to Request
  ├─ belongs to Resource
  ├─ belongs to Student
  ├─ belongs to allocatedBy (Staff)
  ├─ has one ClaimSchedule
  └─ has one Distribution

ClaimSchedule
  ├─ belongs to Allocation
  ├─ belongs to Request
  ├─ belongs to Student
  ├─ belongs to Resource
  ├─ belongs to verifiedBy (Staff)
  └─ has one Distribution

Distribution
  ├─ belongs to Allocation
  ├─ belongs to Request
  ├─ belongs to ClaimSchedule
  ├─ belongs to Student
  ├─ belongs to Resource
  └─ belongs to releasedBy (Staff)

Inventory
  ├─ belongs to Resource
  └─ tracks available/reserved/issued quantities

Resource
  ├─ has many Requests
  ├─ has many Allocations
  ├─ has many Distributions
  └─ has one Inventory record

AuditLog
  ├─ belongs to actor (User)
  ├─ tracks changes to any entity (Request, Allocation, etc.)
  └─ records previousStatus → newStatus transitions

Notification
  ├─ belongs to user (recipient)
  ├─ related to Request/Allocation/ClaimSchedule/Distribution
  └─ tracks sent/read status
```

---

## Best Practices

1. **Always validate eligibility before approval** - Use Step 3 API
2. **Reserve inventory at approval** - Use Step 4 API
3. **Create schedules before pickup** - Use Step 5 API
4. **Verify identity at pickup** - Use Step 7 API
5. **Release only after verification** - Use Step 8 API
6. **Monitor reports regularly** - Use Step 9 APIs
7. **Maintain audit trails** - All actions logged automatically
8. **Handle notifications** - System sends automatically at each step
9. **Check inventory levels** - Before approving large requests
10. **Use campus filter** - When reporting by location

---

## Rate Limiting

All endpoints are subject to rate limiting. Current limits:
- **Public endpoints:** 100 requests/hour
- **Authenticated endpoints:** 1000 requests/hour
- **Admin endpoints:** 5000 requests/hour

---

## Support

For issues or questions:
- Check the error response for specific details
- Review the audit log for transaction history
- Contact system admin at admin@university.edu
