const { campusFilter } = require("../middleware/campusScope");

function reportFilter(req) {
  const filter = campusFilter(req);
  const { startDate, endDate } = req.query;
  if (!startDate && !endDate) return filter;
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime())) || (start && end && start > end)) throw Object.assign(new Error("Invalid report date range."), { status: 400 });
  if (end && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) end.setUTCHours(23, 59, 59, 999);
  filter.createdAt = { ...(start ? { $gte: start } : {}), ...(end ? { $lte: end } : {}) };
  return filter;
}
module.exports = { reportFilter };
