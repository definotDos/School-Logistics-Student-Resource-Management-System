# Integration Testing Guide - SLSRMS

This document provides a comprehensive guide to running and understanding the integration tests for the School Logistics Resource Management System.

## Overview

The integration test suite covers:

1. **Complete 9-Step Workflow** - Full end-to-end test of the resource request lifecycle
2. **API Endpoints** - Individual endpoint tests with various scenarios
3. **Error Handling** - Validation and error response testing
4. **Role-Based Access Control** - Permission validation
5. **Data Persistence** - Database verification

---

## Prerequisites

### Software Requirements
- Node.js 14+ 
- MongoDB (local or test instance)
- npm or yarn

### Install Test Dependencies
```bash
cd backend
npm install
```

This installs:
- `jest` - Testing framework
- `supertest` - HTTP assertion library
- Existing project dependencies

### MongoDB Setup

#### Option 1: Local MongoDB
```bash
# Start MongoDB (Windows)
mongod

# Or with Homebrew (macOS)
brew services start mongodb-community
```

#### Option 2: MongoDB Atlas (Cloud)
Update `.env.test`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/slsrms_test
```

#### Option 3: Docker Container
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Run only workflow tests
npm test -- workflow.test.js

# Run only endpoint tests
npm test -- endpoints.test.js
```

### Run with Coverage
```bash
npm run test:coverage
```

Shows code coverage for all source files.

### Watch Mode (Auto-rerun on file changes)
```bash
npm run test:watch
```

### Run Integration Tests Only
```bash
npm run test:integration
```

---

## Test Structure

### 1. Workflow Test (`tests/integration/workflow.test.js`)

Complete 9-step workflow with all transitions and validations.

**Test Suites:**

#### Step 1: User Login (Role-based)
```
✓ Student signup and login
✓ Staff signup and login
✓ Admin signup and login
```

Tests role-based user creation and authentication.

#### Setup: Create Resource and Inventory
```
✓ Create a resource (admin)
✓ Create inventory for resource
```

Initializes test data for workflow.

#### Step 2: Student Requests Resource
```
✓ Student creates request
✓ Prevents duplicate active requests
✓ Student views their requests
```

Tests request creation and validation.

#### Step 3: Student Affairs Verifies Eligibility
```
✓ Staff views pending requests
✓ Staff verifies eligibility
✓ Admin approves request
✓ Creates audit log for approval
```

Tests eligibility verification and approval workflow.

#### Step 4: Admin Processes Approval & Reserves Resource
```
✓ Admin processes allocation
✓ Inventory reserved when allocated
✓ Request status changes validated
```

Tests resource allocation and inventory reservation.

#### Step 5: Logistics Staff Assigns Claim Schedule
```
✓ Staff creates claim schedule
✓ Allocation status changes to Scheduled
✓ Request status changes to ready_for_claim
✓ Student receives notification
```

Tests pickup scheduling.

#### Step 6: Student Receives Notification
```
✓ Student views pickup schedules
✓ Displays correct schedule details
```

Tests student-facing schedule information.

#### Step 7: Staff Verifies Student Identity at Claim
```
✓ Staff verifies student identity
✓ Request status changes to claimed
```

Tests identity verification at pickup.

#### Step 8: Distribution Completed & Inventory Updated
```
✓ Staff releases resource
✓ Inventory transitions from reserved to issued
✓ Allocation status changes to Released
✓ Request status changes to completed
✓ Distribution record created with reference ID
```

Tests final resource delivery.

#### Step 9: Reports & Monitoring
```
✓ Dashboard overview report
✓ Request workflow report
✓ Approval analytics report
✓ Distribution report
✓ Inventory report
✓ Resource demand report
✓ Audit log report
```

Tests all reporting endpoints.

#### Error Handling & Validations
```
✓ Rejects unauthenticated requests
✓ Rejects invalid role for operation
✓ Rejects non-existent resources
✓ Validates quantity constraints
```

Tests error scenarios.

### 2. Endpoints Test (`tests/integration/endpoints.test.js`)

Individual endpoint testing with various scenarios.

**Test Suites:**

#### Request Endpoints
- `POST /api/requests` - Create request
- `GET /api/requests/my` - Get my requests
- `GET /api/requests/status/:status` - Filter by status

#### Inventory Endpoints
- `GET /api/inventory` - List all inventory
- `POST /api/inventory/:resourceId/create` - Create inventory (admin)
- `PATCH /api/inventory/:resourceId/update` - Update inventory (admin)

#### Report Endpoints
- `GET /api/reports/overview` - Dashboard overview
- `GET /api/reports/requests/workflow` - Request workflow report
- `GET /api/reports/requests/approval-analytics` - Approval analytics
- `GET /api/reports/inventory/detail` - Inventory report
- `GET /api/reports/distribution/detail` - Distribution report
- `GET /api/reports/resources/demand` - Resource demand
- `GET /api/reports/audit-log` - Audit log

#### Authentication & Authorization
- Token validation
- Invalid token rejection
- Role-based access control enforcement

#### Error Handling
- 404 for non-existent resources
- 400 for invalid input
- Database error handling

---

## Understanding Test Output

### Successful Test Run
```
PASS  tests/integration/workflow.test.js
  Complete 9-Step Workflow Integration Tests
    Step 1: User Login (Role-based)
      ✓ should allow student to sign up (45 ms)
      ✓ should allow student to login (32 ms)
    ...
    Step 9: Reports & Monitoring
      ✓ should provide dashboard overview (23 ms)
      ✓ should provide request workflow report (18 ms)
    ...

Test Suites: 2 passed, 2 total
Tests:       95 passed, 95 total
```

### Failed Test
```
FAIL  tests/integration/endpoints.test.js
  API Endpoint Tests
    Request Endpoints
      ✗ should create a request with valid data (32 ms)
        
        Expected: 201
        Received: 500
        
        TypeError: Cannot read property '_id' of undefined
```

**Debugging:**
1. Check error message
2. Review test code
3. Check backend logs
4. Verify database connection

---

## Common Issues & Solutions

### Issue 1: MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB
mongod

# Or use Docker
docker run -d -p 27017:27017 mongo:latest
```

### Issue 2: Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### Issue 3: Test Timeout
```
Jest did not exit one second after the test run has completed
```

**Solution:**
In `jest.config.js`, `forceExit: true` is already set. Check for:
- Unclosed database connections
- Hanging HTTP requests

### Issue 4: Test Data Not Clearing
**Solution:**
Ensure `beforeEach` in `tests/setup.js` runs:
```javascript
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

---

## Test Execution Flow

### Pre-Test Setup
1. Connect to test MongoDB database
2. Clear all collections
3. Initialize app with test configuration

### Workflow Test Flow
```
Step 1: Login
  ├─ Student signs up
  ├─ Staff signs up
  ├─ Admin signs up
  ├─ Student logs in → get token
  ├─ Staff logs in → get token
  └─ Admin logs in → get token

Setup: Create Test Data
  ├─ Admin creates resource
  └─ Admin creates inventory (50 units available)

Step 2: Student Requests
  ├─ Student creates request for 2 units
  ├─ Status: pending
  └─ Verify: No duplicate requests allowed

Step 3: Eligibility & Approval
  ├─ Staff verifies eligibility
  ├─ Admin approves request
  ├─ Status: pending → approved
  └─ Audit log created

Step 4: Allocation
  ├─ Admin processes allocation
  ├─ Allocation status: Reserved
  ├─ Inventory: available 48, reserved 2
  └─ Status: approved (unchanged)

Step 5: Claim Schedule
  ├─ Staff creates schedule
  ├─ Allocation status: Scheduled
  ├─ Request status: ready_for_claim
  └─ Notification sent to student

Step 6: Student Notification
  ├─ Student views their schedules
  └─ Verify: Correct date, time, location

Step 7: Identity Verification
  ├─ Staff verifies identity
  ├─ Claim schedule status: Confirmed
  └─ Request status: claimed

Step 8: Resource Release
  ├─ Staff releases resource
  ├─ Inventory: available 48, issued 2, reserved 0
  ├─ Distribution record created
  ├─ Request status: completed
  └─ Allocation status: Released

Step 9: Reports
  ├─ Dashboard overview
  ├─ Request statistics
  ├─ Approval analytics
  ├─ Distribution report
  ├─ Inventory report
  ├─ Resource demand
  └─ Audit log

Verify Complete
  ├─ All records exist
  ├─ All statuses correct
  └─ All data persisted
```

---

## Test Coverage Metrics

Run with coverage:
```bash
npm run test:coverage
```

Expected coverage:
```
Statements   : 75-85%
Branches     : 70-80%
Functions    : 75-85%
Lines        : 75-85%
```

To improve coverage:
1. Add edge case tests
2. Test error scenarios
3. Add negative test cases

---

## Data Validation During Tests

### Inventory Tracking
```javascript
Before Approval: { available: 50, reserved: 0, issued: 0 }
After Approval:  { available: 48, reserved: 2, issued: 0 }
After Release:   { available: 48, reserved: 0, issued: 2 }
```

### Status Transitions
```
Request:       pending → approved → ready_for_claim → claimed → released → completed
Allocation:    Reserved → Scheduled → Verified → Released
Schedule:      Scheduled → Confirmed → Completed
Distribution:  Pending → Prepared → Released → Received → Completed
```

### Audit Log Entries
```
Each action creates an AuditLog entry:
- actor: Staff ID
- action: "request_created", "request_approved", etc.
- entity: "Request"
- previousStatus → newStatus
- timestamp
```

---

## Frontend Testing

While backend integration tests are in Jest, frontend can be tested with:

### Vitest (Frontend)
```bash
cd frontend
npm install -D vitest

# Run frontend tests
npm run test
```

### Example Frontend Test
```javascript
import { render, screen } from "@testing-library/react";
import { requestAPI } from "@/services/api";

describe("StudentRequest Component", () => {
  it("should display request form", () => {
    render(<StudentRequest />);
    expect(screen.getByText("Request Resource")).toBeInTheDocument();
  });

  it("should call API on submit", async () => {
    const spy = jest.spyOn(requestAPI, "create");
    render(<StudentRequest />);
    
    // Fill form and submit
    // Assert spy was called
  });
});
```

---

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:latest
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      
      - name: Install dependencies
        run: |
          cd backend
          npm install
      
      - name: Run tests
        run: npm test
        env:
          MONGODB_URI: mongodb://localhost:27017/slsrms_test
```

---

## Interpreting Results

### Successful 9-Step Workflow
All 95+ tests pass, indicating:
- ✅ Authentication works (logins)
- ✅ Request creation works
- ✅ Eligibility verification works
- ✅ Approval system works
- ✅ Allocation works
- ✅ Inventory reservation works
- ✅ Scheduling works
- ✅ Identity verification works
- ✅ Resource release works
- ✅ Inventory consumption works
- ✅ Reports generate correctly
- ✅ Audit logs record accurately
- ✅ Role-based access control works
- ✅ Error handling works

### Failed Test Analysis
1. **Authentication failure** → Check JWT setup
2. **Status transition failure** → Check model validation
3. **Inventory mismatch** → Check reservation/release logic
4. **Report failure** → Check aggregation queries
5. **Permissions failure** → Check middleware

---

## Next Steps

1. ✅ Run full test suite: `npm test`
2. ✅ Check coverage: `npm run test:coverage`
3. ✅ Monitor for failures during development
4. ✅ Add new tests for new features
5. ✅ Integrate with CI/CD pipeline
6. ✅ Set up notifications for test failures

---

## Support

For test-related issues:
- Check test output for specific error
- Review test file for assertions
- Check backend logs
- Verify database state
- Check .env configuration
