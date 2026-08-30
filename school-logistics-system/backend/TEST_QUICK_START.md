# Quick Start - Integration Testing

## 1. Setup (First Time)

```bash
cd backend

# Install dependencies (includes Jest & supertest)
npm install

# Verify MongoDB is running
mongod
```

## 2. Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- workflow.test.js
npm test -- endpoints.test.js

# Run with coverage
npm run test:coverage

# Watch mode (auto-rerun on changes)
npm run test:watch
```

## 3. Expected Output

### Successful Run
```
PASS  tests/integration/workflow.test.js (12.345s)
PASS  tests/integration/endpoints.test.js (8.234s)

Test Suites: 2 passed, 2 total
Tests:       95 passed, 95 total
Time:        20.579s
```

### What Each Test Verifies

**workflow.test.js (95+ tests):**
- ✅ Step 1: User authentication (signup/login)
- ✅ Step 2: Student requests resource
- ✅ Step 3: Staff verifies & admin approves
- ✅ Step 4: Admin allocates & reserves inventory
- ✅ Step 5: Staff schedules pickup
- ✅ Step 6: Student views schedule
- ✅ Step 7: Staff verifies identity
- ✅ Step 8: Staff releases resource (inventory updated)
- ✅ Step 9: Reports generated correctly
- ✅ Audit logs created for all actions
- ✅ Error handling & validation

**endpoints.test.js (40+ tests):**
- ✅ Request endpoints (create, view, filter)
- ✅ Inventory endpoints (list, create, update)
- ✅ Report endpoints (all 7 reports)
- ✅ Authentication (token validation)
- ✅ Authorization (role-based access)
- ✅ Error scenarios (404, 400, 403)

## 4. Troubleshooting

### MongoDB Connection Failed
```bash
# Start MongoDB
mongod

# Or with Docker
docker run -d -p 27017:27017 mongo:latest
```

### Tests Hanging
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Try again
npm test
```

### Clear Test Database
```bash
# Tests auto-clear between runs, but if needed:
mongo slsrms_test --eval "db.dropDatabase()"
```

## 5. What Data is Tested?

### Complete Workflow Chain
```
Student: John Student (student@university.edu)
Staff: Jane Staff (staff@university.edu)
Admin: Admin User (admin@university.edu)

Resource: School Uniform (50 units available)

Flow:
  1. Student creates request (2 units) → Status: pending
  2. Staff verifies eligibility → Eligible
  3. Admin approves → Status: approved
  4. Admin allocates → Inventory reserved (48 available, 2 reserved)
  5. Staff schedules pickup → Status: ready_for_claim
  6. Staff verifies identity → Status: claimed
  7. Staff releases resource → Status: completed
  8. Inventory updated → (48 available, 2 issued)
  9. Reports show: 1 request completed, inventory accurate
```

## 6. Check Test Coverage

```bash
npm run test:coverage
```

Output shows coverage by file:
- Statements: % of code executed
- Branches: % of if/else paths tested
- Functions: % of functions called
- Lines: % of lines executed

Target: 75%+ coverage

## 7. Common Test Scenarios

### Scenario 1: Happy Path (Complete Workflow)
- All 8 steps execute successfully
- Inventory correctly updated
- Reports show completed request

### Scenario 2: Eligibility Rejection
- Request created → pending
- Staff marks ineligible
- Request status → rejected
- No inventory reserved

### Scenario 3: Duplicate Request Prevention
- Student creates request → pending
- Student tries to create another for same resource
- Second request rejected (error: "already have active request")

### Scenario 4: Permission Validation
- Student tries to approve request → 403 error
- Staff tries to process allocation → 403 error
- Only correct roles allowed

### Scenario 5: Missing Data Handling
- Request without resource ID → 400 error
- Quantity > max allowed → 400 error
- Negative quantity → 400 error

## 8. Reading Test Output

### Test Name Structure
```
Complete 9-Step Workflow Integration Tests
  ├─ Step 1: User Login (Role-based)
  │   ├─ ✓ should allow student to sign up
  │   ├─ ✓ should allow staff to sign up
  │   └─ ✓ should allow admin to sign up
  ├─ Step 2: Student Requests Resource
  │   ├─ ✓ should allow student to create request
  │   ├─ ✓ should prevent duplicate active requests
  │   └─ ✓ should allow student to view their requests
  ...
```

### Pass (✓) vs Fail (✗)
- **✓ (green)** = Test passed, assertion succeeded
- **✗ (red)** = Test failed, assertion failed, needs investigation

## 9. Test Debugging Tips

### Print Test State
Add to test:
```javascript
console.log("User:", studentUser);
console.log("Request:", request);
console.log("Inventory:", inventory);
```

### Check Database During Test
```bash
# In another terminal
mongo slsrms_test
> db.requests.find()
> db.inventories.find()
> db.distributions.find()
```

### Isolate Failing Test
```bash
# Run only failing test
npm test -- --testNamePattern="should verify student identity"
```

## 10. Verify System is Working

After tests pass:

```bash
# 1. Start backend
cd backend
npm run dev

# 2. In another terminal, test a single endpoint
curl -X GET http://localhost:5000/api/resources \
  -H "Authorization: Bearer {token}"

# 3. Check response
# Should return: { success: true, resources: [...] }
```

## 11. Next Steps

1. ✅ All tests passing → System is ready
2. ✅ Start frontend development
3. ✅ Integrate API calls in React components
4. ✅ Test end-to-end in browser
5. ✅ Deploy to production

---

## Test Files Location

```
backend/
  ├── jest.config.js              ← Jest configuration
  ├── tests/
  │   ├── setup.js                ← Database setup/teardown
  │   └── integration/
  │       ├── workflow.test.js     ← 9-step workflow tests (95+ tests)
  │       └── endpoints.test.js    ← API endpoint tests (40+ tests)
  └── INTEGRATION_TESTING_GUIDE.md ← Full documentation
```

## Contact

For issues with tests:
1. Check test output error message
2. Review INTEGRATION_TESTING_GUIDE.md
3. Check MongoDB connection
4. Review test file for expectations
5. Check backend logs
