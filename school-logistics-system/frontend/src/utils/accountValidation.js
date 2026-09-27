import policy from '../../../shared/account-policy.json';
export { policy };
export const courses = Object.values(policy.programGroups).flat();
export const levelsForProgram = program => policy.programLevels[Object.keys(policy.programGroups).find(group => policy.programGroups[group].includes(program))] || [];
export const emailValid = value => typeof value === 'string' && value.trim().length <= 254 && value.trim().split('@')[0].length <= 64 && new RegExp(policy.emailPattern, 'i').test(value.trim());
export const idType = value => new RegExp(policy.studentIdPattern).test(String(value || '').trim().toUpperCase()) ? 'student' : new RegExp(policy.employeeIdPattern).test(String(value || '').trim().toUpperCase()) ? 'employee' : null;
export function validateAccount(form, administrator = false) {
 const errors = {};
 if (!form.name || form.name.trim().length < 2 || form.name.trim().length > 100) errors.name = 'Enter a full name of 2 to 100 characters.';
 if (!emailValid(form.email)) errors.email = 'Use a valid @phinmaed.com email address.';
 if (!form.campus) errors.campus = 'Choose an active campus.';
 if (!form.password || form.password.length < 8 || new TextEncoder().encode(form.password).length > 72) errors.password = 'Password must contain at least 8 characters and at most 72 UTF-8 bytes.';
 const type = idType(form.studentId);
 if (!type || (form.role === 'student') !== (type === 'student')) errors.studentId = policy.idHelp;
 if (!policy.roles.includes(form.role) || (!administrator && form.role !== 'student')) errors.role = 'Staff accounts must be created by an administrator.';
 if (form.role === 'student' && (administrator || form.strand !== undefined) && !courses.includes(form.strand)) errors.strand = 'Choose a supported course or strand.';
 return errors;
}
