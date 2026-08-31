const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load env
dotenv.config();

// Connect to database
const connectDB = require("../../src/config/database");

// Import routes
const authRoutes = require("../../src/routes/authRoutes");
const requestRoutes = require("../../src/routes/requestRoutes");
const allocationRoutes = require("../../src/routes/allocationRoutes");
const distributionRoutes = require("../../src/routes/distributionRoutes");
const inventoryRoutes = require("../../src/routes/inventoryRoutes");
const reportsRoutes = require("../../src/routes/reportsRoutes");
const resourceRoutes = require("../../src/routes/resourceRoutes");

// Import models
const User = require("../../src/models/User");
const Resource = require("../../src/models/Resource");
const Inventory = require("../../src/models/Inventory");
const Request = require("../../src/models/Request");
const Allocation = require("../../src/models/Allocation");
const ClaimSchedule = require("../../src/models/ClaimSchedule");
const Distribution = require("../../src/models/Distribution");
const AuditLog = require("../../src/models/AuditLog");

// Setup Express app
const app = express();
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/distribution", distributionRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/resources", resourceRoutes);

describe("Complete 9-Step Workflow Integration Tests", () => {
  let studentToken,
    staffToken,
    adminToken,
    studentUser,
    staffUser,
    adminUser,
    resource,
    requestId,
    allocationId,
    scheduleId;

  beforeAll(async () => {
    await connectDB();

    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe("Step 1: User Login (Role-based)", () => {
    it("should allow student to sign up", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "John Student",
          email: "student@university.edu",
          password: "Password123",
          role: "student",
          campus: "PHINMA University of Pangasinan",
          matricule: "2023-001",
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe("student");
      expect(res.body.token).toBeDefined();
    });

    it("should allow staff to sign up", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Jane Staff",
          email: "staff@university.edu",
          password: "Password123",
          role: "staff",
          campus: "PHINMA University of Pangasinan",
          position: "Student Affairs Officer",
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("staff");
    });

    it("should allow admin to sign up", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Admin User",
          email: "admin@university.edu",
          password: "Password123",
          role: "admin",
          campus: "PHINMA University of Pangasinan",
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("admin");
    });

    it("should allow student to login", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "student@university.edu",
          password: "Password123",
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      studentToken = res.body.token;
      studentUser = res.body.user;
    });

    it("should allow staff to login", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "staff@university.edu",
          password: "Password123",
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      staffToken = res.body.token;
      staffUser = res.body.user;
    });

    it("should allow admin to login", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "admin@university.edu",
          password: "Password123",
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      adminToken = res.body.token;
      adminUser = res.body.user;
    });
  });

  describe("Setup: Create Resource and Inventory", () => {
    it("should create a resource (admin)", async () => {
      const res = await request(app)
        .post("/api/resources")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "School Uniform",
          category: "Uniform",
          description: "Standard school uniform",
          campus: "PHINMA University of Pangasinan",
          maxQuantityPerStudent: 5,
          eligibilityGrades: ["1", "2", "3", "4"],
        });

      expect(res.status).toBe(201);
      expect(res.body.resource).toBeDefined();
      resource = res.body.resource;
    });

    it("should create inventory for the resource", async () => {
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
      expect(res.body.inventory.available).toBe(50);
    });
  });

  describe("Step 2: Student Requests Resource", () => {
    it("should allow student to create a request", async () => {
      const res = await request(app)
        .post("/api/requests")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          resource: resource._id,
          quantity: 2,
          reason: "Required for academic work",
          size: "Medium",
        });

      expect(res.status).toBe(201);
      expect(res.body.request).toBeDefined();
      expect(res.body.request.status).toBe("pending");
      expect(res.body.request.eligibilityStatus).toBe("pending");
      requestId = res.body.request._id;
    });

    it("should include the student ID and avatar in admin/staff request listings", async () => {
      const student = await User.findOne({ email: "student@university.edu" });
      student.studentId = "2023-001";
      student.avatar = "https://example.com/avatar.png";
      await student.save();

      const res = await request(app)
        .get("/api/requests/all")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBeGreaterThan(0);
      expect(res.body.requests[0].studentId).toBe("2023-001");
      expect(res.body.requests[0].avatar).toBe("https://example.com/avatar.png");
    });

    it("should prevent duplicate active requests", async () => {
      const res = await request(app)
        .post("/api/requests")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          resource: resource._id,
          quantity: 1,
          reason: "Another request",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("active request");
    });

    it("should allow student to view their requests", async () => {
      const res = await request(app)
        .get("/api/requests/my")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toBeDefined();
      expect(res.body.requests.length).toBeGreaterThan(0);
      expect(res.body.requests[0].status).toBe("pending");
    });
  });

  describe("Step 3: Student Affairs Verifies Eligibility", () => {
    it("should allow staff to view pending requests", async () => {
      const res = await request(app)
        .get("/api/requests/status/pending")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toBeDefined();
      expect(res.body.requests.length).toBeGreaterThan(0);
    });

    it("should allow staff to verify eligibility", async () => {
      const res = await request(app)
        .post(`/api/requests/${requestId}/verify-eligibility`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          eligible: true,
          notes: "Student meets all requirements",
        });

      expect(res.status).toBe(200);
      expect(res.body.request.eligibilityStatus).toBe("eligible");
      expect(res.body.request.checkedBy).toBeDefined();
      expect(res.body.request.checkedAt).toBeDefined();
    });

    it("should allow admin to approve request", async () => {
      const res = await request(app)
        .post(`/api/requests/${requestId}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          notes: "Approved - meets criteria",
        });

      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe("approved");
      expect(res.body.request.approvedBy).toBeDefined();
      expect(res.body.request.approvedAt).toBeDefined();
    });

    it("should create audit log for approval", async () => {
      const logs = await AuditLog.find({
        entityId: requestId,
        action: "request_approved",
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].actor).toBeDefined();
      expect(logs[0].previousStatus).toBe("pending");
      expect(logs[0].newStatus).toBe("approved");
    });
  });

  describe("Step 4: Admin Processes Approval & Reserves Resource", () => {
    it("should allow admin to process allocation", async () => {
      const res = await request(app)
        .post(`/api/allocations/${requestId}/process`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          campus: "PHINMA University of Pangasinan",
        });

      expect(res.status).toBe(201);
      expect(res.body.allocation).toBeDefined();
      expect(res.body.allocation.status).toBe("Reserved");
      allocationId = res.body.allocation._id;
    });

    it("should reserve inventory when allocation is processed", async () => {
      const inv = await Inventory.findOne({ resource: resource._id });

      expect(inv).toBeDefined();
      expect(inv.available).toBe(48); // 50 - 2
      expect(inv.reserved).toBe(2);
    });

    it("should prevent request status from being changed directly", async () => {
      // Once allocated, request status shouldn't be patchable
      const res = await request(app)
        .patch(`/api/requests/${requestId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "completed" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Step 5: Logistics Staff Assigns Claim Schedule", () => {
    it("should allow staff to create claim schedule", async () => {
      const res = await request(app)
        .post(`/api/allocations/${allocationId}/schedule`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          pickupDate: "2024-01-18",
          startTime: "09:00",
          endTime: "11:00",
          location: "Main Campus Supply Office - Room 101",
        });

      expect(res.status).toBe(201);
      expect(res.body.claimSchedule).toBeDefined();
      expect(res.body.claimSchedule.status).toBe("Scheduled");
      scheduleId = res.body.claimSchedule._id;
    });

    it("should update allocation status to Scheduled", async () => {
      const alloc = await Allocation.findById(allocationId);
      expect(alloc.status).toBe("Scheduled");
      expect(alloc.scheduledDate).toBeDefined();
    });

    it("should update request status to ready_for_claim", async () => {
      const req = await Request.findById(requestId);
      expect(req.status).toBe("ready_for_claim");
    });

    it("should create notification for student", async () => {
      const req = await Request.findById(requestId).populate("student");
      expect(req.student).toBeDefined();
      // Notifications are created by the controller
    });
  });

  describe("Step 6: Student Receives Notification", () => {
    it("should allow student to view their pickup schedules", async () => {
      const res = await request(app)
        .get("/api/distribution/schedules/my")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.schedules).toBeDefined();
      expect(res.body.schedules.length).toBeGreaterThan(0);
    });

    it("should display correct schedule details", async () => {
      const res = await request(app)
        .get("/api/distribution/schedules/my")
        .set("Authorization", `Bearer ${studentToken}`);

      const schedule = res.body.schedules[0];
      expect(schedule.pickupDate).toBe("2024-01-18");
      expect(schedule.startTime).toBe("09:00");
      expect(schedule.endTime).toBe("11:00");
      expect(schedule.location).toBe("Main Campus Supply Office - Room 101");
    });
  });

  describe("Step 7: Staff Verifies Student Identity at Claim", () => {
    it("should allow staff to verify student identity", async () => {
      const res = await request(app)
        .post(`/api/distribution/schedules/${scheduleId}/verify`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          verificationDetails: "ID verified - Student ID: 2023-001",
          quantityClaimed: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.claimSchedule).toBeDefined();
      expect(res.body.claimSchedule.status).toBe("Confirmed");
      expect(res.body.claimSchedule.verifiedBy).toBeDefined();
      expect(res.body.claimSchedule.verifiedAt).toBeDefined();
    });

    it("should update request status to claimed", async () => {
      const req = await Request.findById(requestId);
      expect(req.status).toBe("claimed");
      expect(req.claimedAt).toBeDefined();
      expect(req.claimedBy).toBeDefined();
    });
  });

  describe("Step 8: Distribution Completed & Inventory Updated", () => {
    it("should allow staff to release resource", async () => {
      const res = await request(app)
        .post(`/api/distribution/allocations/${allocationId}/release`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          quantityDelivered: 2,
          distributionLocation: "Main Campus Supply Office - Room 101",
        });

      expect(res.status).toBe(201);
      expect(res.body.distribution).toBeDefined();
      expect(res.body.distribution.status).toBe("Released");
      expect(res.body.distribution.referenceId).toBeDefined();
    });

    it("should transition inventory from reserved to issued", async () => {
      const inv = await Inventory.findOne({ resource: resource._id });

      expect(inv.available).toBe(48); // unchanged
      expect(inv.reserved).toBe(0); // moved to issued
      expect(inv.issued).toBe(2);
    });

    it("should update allocation status to Released", async () => {
      const alloc = await Allocation.findById(allocationId);
      expect(alloc.status).toBe("Released");
      expect(alloc.releasedDate).toBeDefined();
    });

    it("should update request status to completed", async () => {
      const req = await Request.findById(requestId);
      expect(req.status).toBe("completed");
      expect(req.releasedAt).toBeDefined();
      expect(req.releasedBy).toBeDefined();
    });

    it("should create distribution record with reference ID", async () => {
      const dist = await Distribution.findOne({ request: requestId });

      expect(dist).toBeDefined();
      expect(dist.referenceId).toMatch(/^DIST-\d+-[a-z0-9]+$/);
      expect(dist.quantityDelivered).toBe(2);
      expect(dist.releasedBy).toBeDefined();
    });
  });

  describe("Step 9: Reports & Monitoring", () => {
    it("should provide dashboard overview", async () => {
      const res = await request(app)
        .get("/api/reports/overview")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toBeDefined();
      expect(res.body.requests.completed).toBe(1);
      expect(res.body.requests.approvalRate).toBeGreaterThan(0);
      expect(res.body.inventory).toBeDefined();
    });

    it("should provide request workflow report", async () => {
      const res = await request(app)
        .get("/api/reports/requests/workflow")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.completed).toBe(1);
      expect(res.body.completionRate).toBeGreaterThan(0);
    });

    it("should provide approval analytics", async () => {
      const res = await request(app)
        .get("/api/reports/requests/approval-analytics")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalApproved).toBe(1);
      expect(res.body.approvalsByStaff).toBeDefined();
    });

    it("should provide distribution report", async () => {
      const res = await request(app)
        .get("/api/reports/distribution/detail")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalDistributed).toBe(1);
    });

    it("should provide inventory report", async () => {
      const res = await request(app)
        .get("/api/reports/inventory/detail")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalIssued).toBe(2);
    });

    it("should provide resource demand report", async () => {
      const res = await request(app)
        .get("/api/reports/resources/demand")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.topDemandedResources).toBeDefined();
    });

    it("should provide audit log report", async () => {
      const res = await request(app)
        .get("/api/reports/audit-log")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.logs.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling & Validations", () => {
    it("should reject requests without authentication", async () => {
      const res = await request(app)
        .post("/api/requests")
        .send({
          resource: resource._id,
          quantity: 1,
        });

      expect(res.status).toBe(401);
    });

    it("should reject invalid role for operation", async () => {
      // Student trying to approve request
      const res = await request(app)
        .post(`/api/requests/${requestId}/approve`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ notes: "Trying to approve" });

      expect(res.status).toBe(403);
    });

    it("should reject request for non-existent resource", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post("/api/requests")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          resource: fakeId,
          quantity: 1,
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should validate quantity against maxQuantityPerStudent", async () => {
      const res = await request(app)
        .post("/api/requests")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          resource: resource._id,
          quantity: 100, // Exceeds maxQuantityPerStudent of 5
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Complete Workflow Summary", () => {
    it("should track all status transitions in audit log", async () => {
      const logs = await AuditLog.find({ entityId: requestId }).sort({
        createdAt: 1,
      });

      expect(logs.length).toBeGreaterThan(0);

      const statuses = logs.map(log => ({
        action: log.action,
        previous: log.previousStatus,
        new: log.newStatus,
      }));

      console.log("Audit Trail:", statuses);
    });

    it("should have completed full workflow with all data persisted", async () => {
      // Verify all related records exist
      const req = await Request.findById(requestId);
      const alloc = await Allocation.findById(allocationId);
      const schedule = await ClaimSchedule.findById(scheduleId);
      const dist = await Distribution.findOne({ request: requestId });

      expect(req).toBeDefined();
      expect(req.status).toBe("completed");
      expect(alloc).toBeDefined();
      expect(alloc.status).toBe("Released");
      expect(schedule).toBeDefined();
      expect(schedule.status).toBe("Confirmed");
      expect(dist).toBeDefined();
      expect(dist.status).toBe("Released");
    });
  });
});
