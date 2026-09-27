const policy = require('../../../shared/account-policy.json');
const normalize = value => typeof value === 'string' ? value.trim() : '';
const emailValid = value => typeof value === 'string' && value.trim().length <= 254 && value.trim().split('@')[0].length <= 64 && new RegExp(policy.emailPattern, 'i').test(value.trim());
const idType = value => {
  const id = normalize(value).toUpperCase();
  return new RegExp(policy.studentIdPattern).test(id) ? 'student' : new RegExp(policy.employeeIdPattern).test(id) ? 'employee' : null;
};
const courses = Object.values(policy.programGroups).flat();
const passwordValid = value => typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value, 'utf8') <= 72;
const fail = message => { const error = new Error(message); error.status = 400; throw error; };
function profileFields(body, role, current = {}) {
  const result = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || normalize(body.name).length < 2 || normalize(body.name).length > 100 || /[\x00-\x1f\x7f]/.test(body.name)) fail('Enter a full name of 2 to 100 characters.');
    result.name = normalize(body.name);
  }
  for (const [key, choices] of [['strand', courses], ['grade', policy.grades]]) {
    if (body[key] !== undefined) {
      if (role !== 'student' || !choices.includes(body[key])) fail(key === 'strand' ? 'Choose a supported course or strand.' : 'Choose a valid grade or year level.');
      result[key] = body[key];
    }
  }
  if (role === 'student' && (body.strand !== undefined || body.grade !== undefined)) {
    const program = result.strand ?? current.strand;
    const grade = result.grade ?? current.grade;
    const group = Object.keys(policy.programGroups).find(key => policy.programGroups[key].includes(program));
    if (grade && policy.grades.includes(grade) && !policy.programLevels[group]?.includes(grade)) fail('Choose a grade or year level that matches your program.');
  }
  if (body.avatar !== undefined) {
    if (typeof body.avatar !== 'string' || body.avatar.length > 2800000 || (body.avatar && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(body.avatar))) fail('Choose a JPG, PNG, or WebP profile image of at most 2 MB.');
    result.avatar = body.avatar;
  }
  return result;
}
function accountFields(body, administrator = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Provide account information.');
  const allowed = ['name', 'email', 'password', 'campus', 'role', 'studentId', 'strand', 'grade'];
  if (Object.keys(body).some(key => !allowed.includes(key))) fail('Unsupported account field.');
  if (!administrator && body.role !== undefined && body.role !== 'student') { const error = new Error('Staff and administrator accounts must be created by an administrator.'); error.status = 403; throw error; }
  const type = idType(body.studentId);
  if (!type) fail(policy.idHelp);
  if (!administrator && (type !== 'student' || (body.role !== undefined && body.role !== 'student'))) fail('Staff and administrator accounts must be created by an administrator.');
  const role = administrator ? body.role : 'student';
  if (!policy.roles.includes(role)) fail('Choose a valid role.');
  if ((role === 'student') !== (type === 'student')) fail('The ID does not match the account role. ' + policy.idHelp);
  if (!emailValid(body.email)) fail('Use a valid @phinmaed.com email address.');
  if (!passwordValid(body.password)) fail('Password must contain at least 8 characters and at most 72 UTF-8 bytes.');
  if (typeof body.campus !== 'string' || !normalize(body.campus) || body.campus.length > 150) fail('Choose an active campus.');
  const profile = profileFields(body, role);
  if (!profile.name) fail('Full name is required.');
  if (administrator && role === 'student' && !profile.strand) fail('Choose a supported course or strand.');
  return { ...profile, email: normalize(body.email).toLowerCase(), campus: normalize(body.campus), studentId: normalize(body.studentId).toUpperCase(), role };
}
module.exports = { policy, courses, normalize, emailValid, idType, passwordValid, profileFields, accountFields };
