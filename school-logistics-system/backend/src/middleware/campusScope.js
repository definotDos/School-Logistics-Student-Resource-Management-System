const campusFilter = (req) => {
	const campus = req.user?.role === "admin" ? (req.user.activeCampus || req.query?.campus || req.query?.campusFilter) : req.user?.campus;
	return campus ? { campus } : {};
};
const canAccessCampus = (req, record) => !campusFilter(req).campus || record?.campus === campusFilter(req).campus;
module.exports = { campusFilter, canAccessCampus };
