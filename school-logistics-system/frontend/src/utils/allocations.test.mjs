import test from 'node:test';
import assert from 'node:assert/strict';
import { assignedStaffId, canAssignAllocation, needsDistributor, eligibleDistributors } from './allocations.js';

test('only active staff at the allocation campus are offered', () => {
  const staff = [
    { id: '1', name: 'Zoe', role: 'staff', status: 'active', campus: 'A' },
    { id: '2', name: 'Ana', role: 'staff', status: 'active', campus: 'A' },
    { id: '3', name: 'Other campus', role: 'staff', status: 'active', campus: 'B' },
    { id: '4', name: 'Suspended', role: 'staff', status: 'suspended', campus: 'A' },
    { id: '5', name: 'Pending', role: 'staff', status: 'pending', campus: 'A' },
    { id: '6', name: 'Admin', role: 'admin', status: 'active', campus: 'A' },
  ];
  assert.deepEqual(eligibleDistributors({ campus: 'A' }, staff).map(item => item.id), ['2', '1']);
  assert.equal(staff[0].name, 'Zoe');
});
test('completed allocations never appear as needing a distributor', () => {
  for (const status of ['Verified', 'Released']) {
    assert.equal(canAssignAllocation({ status }), false);
    assert.equal(needsDistributor({ status }), false);
  }
  for (const status of ['Reserved', 'Scheduled']) {
    assert.equal(needsDistributor({ status }), true);
    assert.equal(needsDistributor({ status, assignedStaff: 'staff-id' }), false);
  }
});
test('assignment IDs support populated reads and save responses', () => {
  for (const assignedStaff of ['123', { _id: '123', name: 'Ana' }, { id: '123' }]) {
    assert.equal(assignedStaffId({ assignedStaff }), '123');
  }
  assert.equal(assignedStaffId({ assignedStaff: null }), '');
});
