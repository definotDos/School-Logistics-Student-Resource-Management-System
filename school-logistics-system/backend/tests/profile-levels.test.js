const { profileFields } = require('../src/utils/accountValidation');

test.each([
  ['Junior High School', 'Grade 7'], ['STEM', 'Grade 12'], ['BS Information Technology', '3rd Year'],
])('accepts matching program %s and level %s', (strand, grade) => {
  expect(profileFields({ strand, grade }, 'student')).toEqual({ strand, grade });
});

test.each([
  ['Junior High School', 'Grade 11'], ['STEM', '1st Year'], ['BS Information Technology', 'Grade 12'],
])('rejects mismatched program %s and level %s', (strand, grade) => {
  expect(() => profileFields({ strand, grade }, 'student')).toThrow('matches your program');
});

test('validates partial edits against the saved academic details', () => {
  expect(() => profileFields({ grade: '1st Year' }, 'student', { strand: 'STEM' })).toThrow('matches your program');
  expect(() => profileFields({ strand: 'STEM' }, 'student', { grade: '2nd Year' })).toThrow('matches your program');
  expect(profileFields({ name: 'Student Name' }, 'student', { strand: 'STEM', grade: '2nd Year' })).toEqual({ name: 'Student Name' });
});
