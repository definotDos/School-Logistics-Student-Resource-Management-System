export const resources = [
  {
    id: 1,
    icon: 'M',
    tone: 'purple',
    name: 'Learning Module Pack',
    type: 'Academic Materials',
    desc: 'Grade 11 - First Semester 2024-2025',
    stock: 'Available',
  },
  {
    id: 2,
    icon: 'U',
    tone: 'blue',
    name: 'School Uniform Set',
    type: 'Uniforms',
    desc: 'White polo shirt and navy pants/skirt',
    stock: 'Limited',
  },
  {
    id: 3,
    icon: 'S',
    tone: 'gold',
    name: 'School Shoes',
    type: 'Footwear',
    desc: 'Black leather school shoes',
    stock: 'Available',
  },
  {
    id: 4,
    icon: 'ID',
    tone: 'coral',
    name: 'Student ID Card',
    type: 'Identification',
    desc: 'Official school identification card',
    stock: 'Available',
  },
]

export const initialRequests = [
  {
    name: 'Learning Module Pack',
    ref: 'REQ-2024-0157',
    date: 'October 16, 2024',
    status: 'Approved',
    icon: 'M',
    tone: 'purple',
  },
  {
    name: 'School Uniform Set',
    ref: 'REQ-2024-0158',
    date: 'October 17, 2024',
    status: 'Pending Review',
    icon: 'U',
    tone: 'blue',
  },
  {
    name: 'Student ID Card',
    ref: 'REQ-2024-0142',
    date: 'October 09, 2024',
    status: 'Ready for Claim',
    icon: 'ID',
    tone: 'coral',
  },
]

export const navigation = [
  'Dashboard',
  'Browse Resources',
  'My Requests',
  'Claim Schedule',
  'Distribution History',
]

export const categories = [
  'All Categories',
  'Academic Materials',
  'Uniforms',
  'Footwear',
  'Identification',
]
