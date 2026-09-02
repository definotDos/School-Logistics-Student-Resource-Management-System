const request = require("supertest");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("../../src/config/database");
const authRoutes = require("../../src/routes/authRoutes");
const requestRoutes = require("../../src/routes/requestRoutes");
const reportsRoutes = require("../../src/routes/reportsRoutes");
const inventoryRoutes = require("../../src/routes/inventoryRoutes");
const resourceRoutes = require("../../src/routes/resourceRoutes");

const Request = require("../../src/models/Request");
const Resource = require("../../src/models/Resource");
const Inventory = require("../../src/models/Inventory");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/resources", resourceRoutes);

describe("API Endpoint Tests", () => {
  let studentToken, staffToken, adminToken, resource;

  beforeAll(async () => {
    await connectDB();

    // Setup test users
    const student = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Test Student",
        email: "teststudent@university.edu",
        password: "Password123",
        role: "student",
        campus: "PHINMA University of Pangasinan",
        matricule: "TEST-001",
      });

    const staff = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Test Staff",
        email: "teststaff@university.edu",
        password: "Password123",
        role: "staff",
        campus: "PHINMA University of Pangasinan",
      });

    const admin = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Test Admin",
        email: "testadmin@university.edu",
        password: "Password123",
        role: "admin",
        campus: "PHINMA University of Pangasinan",
      });

    studentToken = student.body.token;
    staffToken = staff.body.token;
    adminToken = admin.body.token;

    // Create test resource
    const res = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Test Books",
        category: "Books",
        description: "Test resource for integration tests",
        campus: "PHINMA University of Pangasinan",
        maxQuantityPerStudent: 10,
      });

    resource = res.body.resource;

    // Create inventory
    await request(app)
      .post(`/api/inventory/${resource._id}/create`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        available: 100,
        reserved: 0,
        issued: 0,
      });
  });

  describe("Request Endpoints", () => {
    describe("POST /api/requests - Create Request", () => {
      it("should create a request with valid data", async () => {
        const res = await request(app)
          .post("/api/requests")
          .set("Authorization", `Bearer ${studentToken}`)
          .send({
            resource: resource._id,
            quantity: 3,
            reason: "Needed for studies",
            size: "Medium",
          });

        expect(res.status).toBe(201);
        expect(res.body.request._id).toBeDefined();
        expect(res.body.request.status).toBe("pending");
      });

      it("should reject request without authorization", async () => {
        const res = await request(app)
          .post("/api/requests")
          .send({
            resource: resource._id,
            quantity: 1,
          });

        expect(res.status).toBe(401);
      });

      it("should reject request with invalid quantity", async () => {
        const res = await request(app)
          .post("/api/requests")
          .set("Authorization", `Bearer ${studentToken}`)
          .send({
            resource: resource._id,
            quantity: -1,
          });

        expect(res.status).toBeGreaterThanOrEqual(400);
      });
    });

    describe("GET /api/requests/my - Get My Requests", () => {
      it("should return student's requests", async () => {
        const res = await request(app)
          .get("/api/requests/my")
          .set("Authorization", `Bearer ${studentToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.requests)).toBe(true);
      });

      it("should not return other students' requests", async () => {
        // Create request as student 1
        await request(app)
          .post("/api/requests")
          .set("Authorization", `Bearer ${studentToken}`)
          .send({
            resource: resource._id,
            quantity: 1,
          });

        // Get requests as staff (should not see student's request directly without ID)
        const res = await request(app)
          .get("/api/requests/my")
          .set("Authorization", `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
        // Staff viewing /my should get empty or error
      });
    });

    describe("GET /api/requests/status/:status - Filter by Status", () => {
      it("should return requests with pending status", async () => {
        const res = await request(app)
          .get("/api/requests/status/pending")
          .set("Authorization", `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.requests)).toBe(true);
      });

      it("should only return specified status", async () => {
        const res = await request(app)
          .get("/api/requests/status/pending")
          .set("Authorization", `Bearer ${staffToken}`);

        if (res.body.requests.length > 0) {
          res.body.requests.forEach(req => {
            expect(req.status).toBe("pending");
          });
        }
        expect(res.status).toBe(200);
      });
    });
  });

  describe("Inventory Endpoints", () => {
    describe("GET /api/inventory - List All Inventory", () => {
      it("should return all inventory items", async () => {
        const res = await request(app)
          .get("/api/inventory")
          .set("Authorization", `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
        expect(res.body.inventory).toBeDefined();
        expect(Array.isArray(res.body.inventory)).toBe(true);
      });

      it("should include available, reserved, and issued counts", async () => {
        const res = await request(app)
          .get("/api/inventory")
          .set("Authorization", `Bearer ${staffToken}`);

        if (res.body.inventory.length > 0) {
          const item = res.body.inventory[0];
          expect(item.available).toBeDefined();
          expect(item.reserved).toBeDefined();
          expect(item.issued).toBeDefined();
        }
      });
    });

    describe("POST /api/inventory/:resourceId/create - Create Inventory", () => {
      it("should allow admin to create inventory", async () => {
        const res = await request(app)
          .post(`/api/inventory/${resource._id}/create`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            available: 50,
            reserved: 0,
            issued: 0,
          });

        expect(res.status).toBe(201);
        expect(res.body.inventory).toBeDefined();
      });

      it("should reject non-admin users", async () => {
        const res = await request(app)
          .post(`/api/inventory/${resource._id}/create`)
          .set("Authorization", `Bearer ${studentToken}`)
          .send({
            available: 50,
          });

        expect(res.status).toBe(403);
      });
    });

    describe("PATCH /api/inventory/:resourceId/update - Update Inventory", () => {
      it("should allow admin to update inventory", async () => {
        const res = await request(app)
          .patch(`/api/inventory/${resource._id}/update`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            available: 75,
            reserved: 0,
          });

        expect(res.status).toBe(200);
        expect(res.body.inventory).toBeDefined();
      });

      it("should reject non-admin users", async () => {
        const res = await request(app)
          .patch(`/api/inventory/${resource._id}/update`)
          .set("Authorization", `Bearer ${staffToken}`)
          .send({
            available: 50,
          });

        expect(res.status).toBe(403);
      });
    });
  });

  describe("Report Endpoints", () => {
    describe("GET /api/reports/overview - Dashboard Overview", () => {
      it("should return overview data", async () => {
        const res = await request(app)
          .get("/api/reports/overview")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.requests).toBeDefined();
        expect(res.body.inventory).toBeDefined();
      });

      it("should include completion rate", async () => {
        const res = await request(app)
          .get("/api/reports/overview")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.body.requests.completionRate).toBeDefined();
        expect(typeof res.body.requests.completionRate).toBe("number");
      });

      it("should include dashboard summary fields used by the admin UI", async () => {
        const res = await request(app)
          .get("/api/reports/overview")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.pendingRequests).toBeDefined();
        expect(res.body.availableResources).toBeDefined();
        expect(res.body.activeUsers).toBeDefined();
        expect(typeof res.body.pendingRequests).toBe("number");
        expect(typeof res.body.availableResources).toBe("number");
        expect(typeof res.body.activeUsers).toBe("number");
      });

      it("should filter by campus if provided", async () => {
        const res = await request(app)
          .get("/api/reports/overview?campus=PHINMA University of Pangasinan")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
      });
    });

    describe("GET /api/reports/requests/workflow - Request Workflow Report", () => {
      it("should return request statistics", async () => {
        const res = await request(app)
          .get("/api/reports/requests/workflow")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.summary).toBeDefined();
        expect(res.body.approvalRate).toBeDefined();
      });

      it("should support date filtering", async () => {
        const res = await request(app)
          .get(
            "/api/reports/requests/workflow?startDate=2024-01-01&endDate=2024-12-31"
          )
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
      });
    });

    describe("GET /api/reports/requests/approval-analytics - Approval Analytics", () => {
      it("should return approval statistics", async () => {
        const res = await request(app)
          .get("/api/reports/requests/approval-analytics")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.summary).toBeDefined();
      });

      it("should include approval rates and rejection reasons", async () => {
        const res = await request(app)
          .get("/api/reports/requests/approval-analytics")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.body.summary.approvalRate).toBeDefined();
        expect(res.body.topRejectionReasons).toBeDefined();
      });
    });

    describe("GET /api/reports/inventory/detail - Inventory Report", () => {
      it("should return detailed inventory report", async () => {
        const res = await request(app)
          .get("/api/reports/inventory/detail")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.summary).toBeDefined();
        expect(res.body.details).toBeDefined();
      });
    });

    describe("GET /api/reports/distribution/detail - Distribution Report", () => {
      it("should return distribution statistics", async () => {
        const res = await request(app)
          .get("/api/reports/distribution/detail")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.summary).toBeDefined();
      });
    });

    describe("GET /api/reports/resources/demand - Resource Demand Report", () => {
      it("should return resource demand data", async () => {
        const res = await request(app)
          .get("/api/reports/resources/demand")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.summary).toBeDefined();
      });
    });

    describe("GET /api/reports/audit-log - Audit Log Report", () => {
      it("should return audit log entries", async () => {
        const res = await request(app)
          .get("/api/reports/audit-log")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.logs).toBeDefined();
        expect(Array.isArray(res.body.logs)).toBe(true);
      });

      it("should support filtering by action", async () => {
        const res = await request(app)
          .get("/api/reports/audit-log?action=request_created")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
      });
    });
  });

  describe("Authentication & Authorization", () => {
    it("should reject requests without token", async () => {
      const res = await request(app).get("/api/requests/my");

      expect(res.status).toBe(401);
    });

    it("should reject requests with invalid token", async () => {
      const res = await request(app)
        .get("/api/requests/my")
        .set("Authorization", "Bearer invalid_token");

      expect(res.status).toBe(401);
    });

    it("should enforce role-based access control", async () => {
      // Student trying to access admin-only endpoint
      const res = await request(app)
        .get("/api/reports/overview")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for non-existent request", async () => {
      const res = await request(app)
        .get("/api/requests/999999999999999999999999")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid input", async () => {
      const res = await request(app)
        .post("/api/requests")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          // Missing required fields
          quantity: 1,
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle database errors gracefully", async () => {
      const res = await request(app)
        .get("/api/requests/invalid_id")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
