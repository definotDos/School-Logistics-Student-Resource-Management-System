# Staff & Services Dashboard - Comprehensive Guide

## Overview

The Staff & Services Dashboard is a dedicated interface designed for school staff members to efficiently manage student resource requests, eligibility verification, claims distribution, and related administrative tasks. This dashboard streamlines the entire workflow from request submission to resource distribution.

## Key Features

### 1. **Dashboard Overview**
- **Quick Stats**: View key metrics at a glance
  - Pending Requests count
  - Eligible Students count
  - Scheduled Claims count
  - Released Resources count
- **Performance Metrics**: Track operational efficiency
  - Request fulfillment rate
  - Claim completion rate
  - Distribution accuracy rate
- **Immediate Actions**: Quick links to high-priority tasks
- **Staff Quick Actions**: Shortcuts to common workflows

### 2. **Verify Student Eligibility**
Manage and verify student eligibility for receiving resources.

**Features:**
- View all students with their eligibility status
- Filter students by name, ID, or campus
- Check eligibility criteria
- Mark students as Verified, Pending, or Rejected
- Track eligibility history
- Export eligibility reports

**Actions:**
- Review: Examine student details and eligibility criteria
- Update Status: Change eligibility status
- Export: Generate eligibility lists

### 3. **Review Requests**
Examine and process submitted student resource requests.

**Features:**
- Display all submitted requests with details
- Filter requests by student name, resource type, or status
- Show request priority levels (High, Medium, Low)
- Display submission timestamp
- Track request progress through workflow
- Search functionality for quick access

**Display Information:**
- Request ID (REQ-XXXX-XXXX)
- Student name and resource type
- Submission time
- Current status
- Priority indicator

**Actions:**
- Review: Open detailed request view
- Continue: Resume reviewing multi-step requests

### 4. **Approve or Reject Requests**
Make final approval or rejection decisions on processed requests.

**Features:**
- Review eligibility criteria met/unmet
- Reason for approval/rejection
- Track approval/rejection patterns
- Batch process multiple requests
- Archive decision history
- Generate approval reports

**For Approval:**
- Display reason why request meets requirements
- One-click approval button
- Automatic student notification
- Status update to "Ready for Claim"

**For Rejection:**
- Display reason why request doesn't meet requirements
- One-click rejection button
- Automatic student notification with reason
- Option to resubmit after conditions are met

### 5. **Manage Claim Schedules**
Assign and organize claim windows for students to collect resources.

**Features:**
- Create new claim schedules/windows
- Set date and time for claim collection
- Assign students to specific claim windows
- Track student capacity per window
- View assigned students for each window
- Edit schedule details
- Publish/draft claim windows

**Schedule Information:**
- Window name (e.g., "Claim Window A")
- Date and time range
- Campus location
- Number of students assigned
- Current status (Scheduled, Draft, Completed)

**Actions:**
- Create Schedule: Add new claim collection window
- Edit: Modify schedule details
- Publish: Activate a draft schedule
- View: See assigned students for a window

### 6. **Verify Claims**
Confirm student identity and mark resources as claimed.

**Features:**
- Track claim status (Verified, Pending, No-Show)
- Verify student identity
- Mark resources as physically claimed
- Handle no-shows and reschedule
- Record actual claim timestamp
- Generate claim completion reports

**Claim Information:**
- Claim ID (CLAIM-XXXX)
- Student name and resource
- Scheduled claim date/time
- Current verification status
- Last update timestamp

**Actions:**
- Mark Complete: Confirm resource was successfully claimed
- Verify: Confirm student identity
- Reschedule: Reassign to different claim window (for no-shows)

### 7. **Monitor Distribution**
Track resources released and manage pending distributions.

**Features:**
- View all active distribution runs
- Track distribution progress
- Monitor resource release quantities
- Track pending items awaiting distribution
- View distribution by campus
- Display distribution status (Released, In Progress, Pending)

**Distribution Metrics:**
- Total items released
- Total items pending
- Release percentage
- Campus-wise breakdown

**Status Indicators:**
- **Released**: Resources distributed to students
- **In Progress**: Actively being distributed
- **Pending**: Ready to distribute, not yet released

### 8. **View Student History**
Access detailed history of student requests and claimed resources.

**Features:**
- View complete student record
- See all submitted requests
- Track approval/rejection history
- View claimed resources timeline
- Check student eligibility status history
- Generate individual student reports

**Student Information:**
- Student ID and name
- Total requests submitted
- Approved vs. Pending requests
- Total resources claimed
- Campus and grade information

**Actions:**
- View History: See detailed request timeline
- Export: Generate student report

### 9. **Update Request Status**
Move requests through the approval workflow states.

**Features:**
- Update status from current state to next allowed state
- Display possible status transitions
- Track status change history
- Automatic notifications on status change
- Maintain audit trail

**Request Status States:**
- **Pending**: Initial submission, awaiting review
- **Approved**: Passed eligibility check, ready for scheduling
- **Ready for Claim**: Schedule assigned, awaiting student pickup
- **Released**: Resource physically distributed to student
- **Rejected**: Request denied, doesn't meet requirements

**Status Transitions:**
- Pending → Approved → Ready for Claim → Released
- Pending → Rejected
- Approved → Rejected (if conditions change)
- Ready for Claim → Released

### 10. **Generate Reports**
Create comprehensive operational and analytical reports.

**Available Reports:**

**Request Summary Report**
- Total requests received
- Approval rate percentage
- Rejection rate percentage
- Average processing time
- Campus-wise breakdown
- Resource-wise breakdown

**Approval Analytics**
- Staff approval patterns
- Average approval time per staff
- Approval trends over time
- High-volume resources
- Peak request periods

**Distribution Report**
- Distribution completion rate
- Average distribution time
- Resources released vs. pending
- Campus-wise distribution metrics
- No-show rate and trends

**Student Eligibility Report**
- Eligible student count
- Ineligible student count
- Eligibility trends
- Campus-wise eligibility rates
- Eligibility criteria analysis

**Report Features:**
- Export to PDF/Excel
- Date range filtering
- Campus filtering
- Resource type filtering
- Generate scheduled reports
- Email report delivery

### 11. **Send Notifications**
Communicate important updates to students.

**Notification Types:**

**Approval Notifications**
- Sent when request is approved
- Includes resource details
- Provides claim scheduling information
- Directs to claim schedule page

**Rejection Notifications**
- Sent when request is rejected
- Provides reason for rejection
- Suggests next steps or reapplication options

**Schedule Notifications**
- Sent when claim schedule is assigned
- Includes date, time, and location
- Provides reminders before scheduled time
- Allows schedule management from student portal

**Resource Availability Notifications**
- Alerts when new resources become available
- Informs about upcoming distribution dates
- Encourages students to submit requests

**Notification Features:**
- Draft and schedule notifications
- Send immediately or schedule for later
- Target multiple students
- Customize message templates
- Track delivery status
- Resend failed notifications

**Actions:**
- Compose: Create new notification
- Send: Send draft notification immediately
- Schedule: Send at specified date/time
- Track: Monitor delivery and read status

## Navigation Structure

### Main Sections (Accessible via Sidebar):
1. Overview (Dashboard)
2. Verify Eligibility
3. Review Requests
4. Approve/Reject Requests
5. Manage Claim Schedules
6. Verify Claims
7. Monitor Distribution
8. Student History
9. Update Request Status
10. Reports
11. Send Notifications

### Quick Actions (Available from Dashboard):
- Verify Eligibility
- Review Requests
- Approve/Reject
- Verify Claims
- Manage Schedules
- Monitor Distribution

## Workflow Examples

### Complete Request Processing Workflow
1. **Review** → Student submits request
2. **Verify Eligibility** → Check if student qualifies
3. **Approve/Reject** → Make eligibility decision
4. **Manage Schedules** → Assign to claim window
5. **Update Status** → Mark as "Ready for Claim"
6. **Verify Claims** → Confirm student pickup
7. **Update Status** → Mark as "Released"
8. **Send Notification** → Confirm delivery

### Student Claim Workflow
1. **Manage Schedules** → Create claim window
2. **Send Notification** → Alert students of schedule
3. **Verify Claims** → Confirm student identity
4. **Update Status** → Mark resource as released
5. **View History** → Track completion

### Distribution Monitoring Workflow
1. **Review Requests** → Assess demand
2. **Approve Requests** → Authorize distribution
3. **Manage Schedules** → Plan distribution schedule
4. **Monitor Distribution** → Track progress
5. **Generate Reports** → Analyze performance

## Role Permissions

**Staff/Services Users can:**
- ✓ View all sections
- ✓ Verify student eligibility
- ✓ Review and process requests
- ✓ Approve or reject requests
- ✓ Manage claim schedules
- ✓ Verify student claims
- ✓ Monitor distributions
- ✓ View student history
- ✓ Update request status
- ✓ Generate reports
- ✓ Send notifications to students
- ✗ Cannot create resources (admin only)
- ✗ Cannot manage user accounts (admin only)
- ✗ Cannot change system settings (admin only)

## Best Practices

### Request Processing
1. Review requests in order of submission (FIFO)
2. Check eligibility criteria thoroughly before approval
3. Provide clear reasons for rejections
4. Process requests within 24-48 hours

### Claim Management
1. Schedule claim windows with adequate capacity
2. Notify students at least 48 hours in advance
3. Verify student identity with school ID
4. Document no-shows for follow-up

### Distribution
1. Monitor distribution progress regularly
2. Address pending items promptly
3. Maintain accurate distribution records
4. Communicate delays to students

### Communication
1. Send timely notifications
2. Use clear, professional language
3. Include all relevant details
4. Provide action items in notifications

### Reporting
1. Generate weekly distribution reports
2. Review approval metrics monthly
3. Track student eligibility trends
4. Analyze resource demand patterns

## Keyboard Shortcuts

- **`/`** - Search students/requests
- **`Esc`** - Close modals/dialogs
- **`Enter`** - Submit forms
- **`Ctrl+P`** - Print reports

## Troubleshooting

**Issue: Request not appearing in review queue**
- Solution: Refresh the page or check student eligibility status

**Issue: Cannot approve request**
- Solution: Verify student meets all eligibility criteria

**Issue: Notification not received**
- Solution: Check student's notification settings and communication preferences

**Issue: Claim window not visible to students**
- Solution: Ensure schedule is published (not in draft state)

## Support

For technical issues or questions about the dashboard:
1. Check this documentation first
2. Contact system administrator
3. Submit a support ticket through the system

---

**Last Updated:** 2024
**Version:** 1.0
**Contact:** support@schoollogistics.edu
