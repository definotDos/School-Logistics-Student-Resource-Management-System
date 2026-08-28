const Allocation = require("../models/Allocation");
const ClaimSchedule = require("../models/ClaimSchedule");
const Inventory = require("../models/Inventory");
const Request = require("../models/Request");
const Distribution = require("../models/Distribution");

async function createSchedule(req, res) {
	try {
		const { allocationId, pickupDate, startTime, endTime, location } = req.body;
		if (!allocationId || !pickupDate || !startTime || !endTime || !location?.trim()) return res.status(400).json({ message: "Allocation, date, time, and pickup location are required." });
		const allocation = await Allocation.findById(allocationId);
		if (!allocation || allocation.status !== "Reserved") return res.status(404).json({ message: "Reserved allocation was not found." });
		const schedule = await ClaimSchedule.create({ allocation: allocation._id, student: allocation.student, pickupDate, startTime, endTime, location: location.trim() });
		res.status(201).json({ schedule });
	} catch (error) {
		if (error.code === 11000) return res.status(409).json({ message: "This allocation already has a claim schedule." });
		res.status(500).json({ message: "Unable to create claim schedule." });
	}
}

async function getMySchedules(req, res) {
	try {
		const schedules = await ClaimSchedule.find({ student: req.user._id }).populate({ path: "allocation", populate: { path: "resource", select: "name" } }).sort({ pickupDate: 1 });
		res.json({ schedules });
	} catch {
		res.status(500).json({ message: "Unable to load claim schedules." });
	}
}

async function releaseAllocation(req, res) {
	try {
		const allocation = await Allocation.findById(req.params.allocationId);
		if (!allocation || allocation.status !== "Reserved") return res.status(404).json({ message: "Reserved allocation was not found." });
		const stock = await Inventory.findOneAndUpdate({ resource: allocation.resource, reserved: { $gte: allocation.quantity } }, { $inc: { reserved: -allocation.quantity, issued: allocation.quantity } }, { returnDocument: "after" });
		if (!stock) return res.status(409).json({ message: "Reserved stock is unavailable." });
		allocation.status = "Released";
		await allocation.save();
		await Request.findByIdAndUpdate(allocation.request, { status: "released" });
		const Resource = require("../models/Resource");
		await Resource.findByIdAndUpdate(allocation.resource, { status: stock.available > 0 ? "Available" : "Issued" });
		const distribution = await Distribution.create({ allocation: allocation._id, student: allocation.student, quantity: allocation.quantity, releasedBy: req.user._id, releasedAt: new Date() });
		res.json({ allocation, distribution });
	} catch {
		res.status(500).json({ message: "Unable to release allocation." });
	}
}

module.exports = { createSchedule, getMySchedules, releaseAllocation };