import policy from '../../../shared/account-policy.json';
export { policy };
export const courses = Object.values(policy.programGroups).flat();
export const levelsForProgram = program => policy.programLevels[Object.keys(policy.programGroups).find(group => policy.programGroups[group].includes(program))] || [];
export const emailValid = value => typeof value === 'string' && value.trim().length <= 254 && value.trim().split('@')[0].length <= 64 && new RegExp(policy.emailPattern, 'i').test(value.trim());
export function validateActivation({ email = '', code = '', password = '', confirmPassword = '' }, emailOnly = false) {
 const errors = {};
 if (!email.trim()) errors.email = 'Enter your email address.';
 else if (!emailValid(email)) errors.email = 'Use a valid @phinmaed.com email address.';
 if (emailOnly) return errors;
 if (!code.trim()) errors.code = 'Enter the verification code from your email.';
 else if (!/^\d{6}$/.test(code.trim())) errors.code = 'Enter a 6-digit verification code.';
 if (!password) errors.password = 'Create a password.';
 else if (password.length < 8) errors.password = 'Use at least 8 characters.';
 else if (new TextEncoder().encode(password).length > 72) errors.password = 'Password is too long. Use at most 72 UTF-8 bytes.';
 if (!confirmPassword) errors.confirmPassword = 'Re-enter your password.';
 else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
 return errors;
}
export const idType = value => new RegExp(policy.studentIdPattern).test(String(value || '').trim().toUpperCase()) ? 'student' : new RegExp(policy.employeeIdPattern).test(String(value || '').trim().toUpperCase()) ? 'employee' : null;
export function validateAccount(form, administrator = false) {
 const errors = {};
 if (typeof form.name !== 'string' || form.name.trim().length < 2 || form.name.trim().length > 100 || Array.from(form.name).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) errors.name = 'Enter a full name of 2 to 100 characters.';
 if (!emailValid(form.email)) errors.email = 'Use a valid @phinmaed.com email address.';
 if (!form.campus) errors.campus = 'Choose an active campus.';
 if (!(administrator && form.role === 'staff') && (!form.password || form.password.length < 8 || new TextEncoder().encode(form.password).length > 72)) errors.password = 'Password must contain at least 8 characters and at most 72 UTF-8 bytes.';
 const field = form.role === 'student' ? 'studentId' : 'employeeId';
 const type = idType(form[field]);
 if (!type || (form.role === 'student') !== (type === 'student')) errors[field] = form.role === 'student' ? policy.studentIdHelp : policy.employeeIdHelp;
 if (!policy.roles.includes(form.role) || (!administrator && !['student', 'staff'].includes(form.role))) errors.role = 'Choose a student or staff account.';
 if (form.role === 'student' && (administrator || form.strand !== undefined) && !courses.includes(form.strand)) errors.strand = 'Choose a supported course or strand.';
 return errors;
}

export function formatStudentId(value) {
 const digits = String(value).replace(/\D/g, '').slice(0, 14);
 return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8), digits.slice(8, 14)].filter(Boolean).join('-');
}
