# Appendix B - Data Dictionary

Actual model fields selected for this export. Optional fields may be absent; presentRecords in the CSV gives observed coverage. IDs are strings, and dates are UTC calendar dates rather than MongoDB Extended JSON values. Enum values describe the application schema; legacy records may differ.

## users

| Field | Export type | Meaning | Treatment |
|---|---|---|---|
| _id | String (alias) | Record identifier replaced with a consistent export-only alias. | Consistent identifier alias; no source-ID mapping supplied |
| role | String | Account role. | Retained with sensitive-pattern screening |
| status | String | Current account, resource, or workflow state. | Retained with sensitive-pattern screening |
| campus | String | Institutional campus scope. | Retained with sensitive-pattern screening |
| activeCampus | String | Selected active campus. | Retained with sensitive-pattern screening |
| createdAt | String (YYYY-MM-DD, UTC) | Record creation date. | UTC calendar date only; exact time removed |
| updatedAt | String (YYYY-MM-DD, UTC) | Last update date. | UTC calendar date only; exact time removed |
| dataOrigin | String | Origin classification: synthetic, as confirmed by the dataset owner. | Added based on owner confirmation |

## campus

| Field | Export type | Meaning | Treatment |
|---|---|---|---|
| _id | String (alias) | Record identifier replaced with a consistent export-only alias. | Consistent identifier alias; no source-ID mapping supplied |
| name | String | Campus name, or aliased resource label for resources. | Retained with sensitive-pattern screening |
| status | String | Current account, resource, or workflow state. | Retained with sensitive-pattern screening |
| createdAt | String (YYYY-MM-DD, UTC) | Record creation date. | UTC calendar date only; exact time removed |
| updatedAt | String (YYYY-MM-DD, UTC) | Last update date. | UTC calendar date only; exact time removed |
| dataOrigin | String | Origin classification: synthetic, as confirmed by the dataset owner. | Added based on owner confirmation |

## resources

| Field | Export type | Meaning | Treatment |
|---|---|---|---|
| _id | String (alias) | Record identifier replaced with a consistent export-only alias. | Consistent identifier alias; no source-ID mapping supplied |
| name | String | Campus name, or aliased resource label for resources. | Consistent resource label alias |
| category | String | Resource category, replaced with a consistent category alias. | Consistent category alias |
| campus | String | Institutional campus scope. | Retained with sensitive-pattern screening |
| status | String | Current account, resource, or workflow state. | Retained with sensitive-pattern screening |
| maxQuantityPerStudent | Number | Maximum units permitted per student. | Retained with sensitive-pattern screening |
| totalQuantity | Number | Resource-level total quantity. | Retained with sensitive-pattern screening |
| createdBy | String (alias) | User who created the resource. | Consistent identifier alias; no source-ID mapping supplied |
| lastUpdatedBy | String (alias) | User who last updated the resource. | Consistent identifier alias; no source-ID mapping supplied |
| createdAt | String (YYYY-MM-DD, UTC) | Record creation date. | UTC calendar date only; exact time removed |
| updatedAt | String (YYYY-MM-DD, UTC) | Last update date. | UTC calendar date only; exact time removed |
| dataOrigin | String | Origin classification: synthetic, as confirmed by the dataset owner. | Added based on owner confirmation |

## inventories

| Field | Export type | Meaning | Treatment |
|---|---|---|---|
| _id | String (alias) | Record identifier replaced with a consistent export-only alias. | Consistent identifier alias; no source-ID mapping supplied |
| resource | String (alias) | Resource reference; in requests, an aliased resource display label. | Consistent identifier alias; no source-ID mapping supplied |
| available | Number | Units available for allocation. | Retained with sensitive-pattern screening |
| reserved | Number | Units reserved. | Retained with sensitive-pattern screening |
| issued | Number | Units issued. | Retained with sensitive-pattern screening |
| lastReceivedBy | String (alias) | User who last received inventory. | Consistent identifier alias; no source-ID mapping supplied |
| createdAt | String (YYYY-MM-DD, UTC) | Record creation date. | UTC calendar date only; exact time removed |
| updatedAt | String (YYYY-MM-DD, UTC) | Last update date. | UTC calendar date only; exact time removed |
| dataOrigin | String | Origin classification: synthetic, as confirmed by the dataset owner. | Added based on owner confirmation |

## requests

| Field | Export type | Meaning | Treatment |
|---|---|---|---|
| _id | String (alias) | Record identifier replaced with a consistent export-only alias. | Consistent identifier alias; no source-ID mapping supplied |
| student | String (alias) | Student user reference. | Consistent identifier alias; no source-ID mapping supplied |
| resourceRef | String (alias) | Reference to the resource record. | Consistent identifier alias; no source-ID mapping supplied |
| resource | String | Resource reference; in requests, an aliased resource display label. | Consistent resource label alias |
| quantity | Number | Requested, allocated, or distributed units. | Retained with sensitive-pattern screening |
| uniformStyle | String | Selected uniform style. | Retained with sensitive-pattern screening |
| uniformSize | String | Selected uniform size. | Retained with sensitive-pattern screening |
| category | String | Resource category, replaced with a consistent category alias. | Consistent category alias |
| campus | String | Institutional campus scope. | Retained with sensitive-pattern screening |
| status | String | Current account, resource, or workflow state. | Retained with sensitive-pattern screening |
| eligibilityChecked | Boolean | Whether eligibility has been checked. | Retained with sensitive-pattern screening |
| eligibilityStatus | String | Result of eligibility check. | Retained with sensitive-pattern screening |
| checkedBy | String (alias) | User who checked eligibility. | Consistent identifier alias; no source-ID mapping supplied |
| checkedAt | String (YYYY-MM-DD, UTC) | Eligibility check date. | UTC calendar date only; exact time removed |
| approvedBy | String (alias) | Approving user. | Consistent identifier alias; no source-ID mapping supplied |
| approvedAt | String (YYYY-MM-DD, UTC) | Approval date. | UTC calendar date only; exact time removed |
| rejectedBy | String (alias) | Rejecting user. | Consistent identifier alias; no source-ID mapping supplied |
| rejectedAt | String (YYYY-MM-DD, UTC) | Rejection date. | UTC calendar date only; exact time removed |
| cancelledBy | String (alias) | Cancelling user. | Consistent identifier alias; no source-ID mapping supplied |
| cancelledAt | String (YYYY-MM-DD, UTC) | Cancellation date. | UTC calendar date only; exact time removed |
| claimedAt | String (YYYY-MM-DD, UTC) | Claim date. | UTC calendar date only; exact time removed |
| releasedAt | String (YYYY-MM-DD, UTC) | Release date. | UTC calendar date only; exact time removed |
| releasedBy | String (alias) | User who released the resource. | Consistent identifier alias; no source-ID mapping supplied |
| priority | String | Request priority. | Retained with sensitive-pattern screening |
| createdAt | String (YYYY-MM-DD, UTC) | Record creation date. | UTC calendar date only; exact time removed |
| updatedAt | String (YYYY-MM-DD, UTC) | Last update date. | UTC calendar date only; exact time removed |
| dataOrigin | String | Origin classification: synthetic, as confirmed by the dataset owner. | Added based on owner confirmation |

## allocations

| Field | Export type | Meaning | Treatment |
|---|---|---|---|
| _id | String (alias) | Record identifier replaced with a consistent export-only alias. | Consistent identifier alias; no source-ID mapping supplied |
| request | String (alias) | Related request reference. | Consistent identifier alias; no source-ID mapping supplied |
| student | String (alias) | Student user reference. | Consistent identifier alias; no source-ID mapping supplied |
| resource | String (alias) | Resource reference; in requests, an aliased resource display label. | Consistent identifier alias; no source-ID mapping supplied |
| quantity | Number | Requested, allocated, or distributed units. | Retained with sensitive-pattern screening |
| status | String | Current account, resource, or workflow state. | Retained with sensitive-pattern screening |
| allocatedBy | String (alias) | User who allocated the resource. | Consistent identifier alias; no source-ID mapping supplied |
| assignedStaff | String (alias) | Assigned staff user. | Consistent identifier alias; no source-ID mapping supplied |
| allocationDate | String (YYYY-MM-DD, UTC) | Allocation date. | UTC calendar date only; exact time removed |
| scheduledDate | String (YYYY-MM-DD, UTC) | Scheduled date. | UTC calendar date only; exact time removed |
| verifiedDate | String (YYYY-MM-DD, UTC) | Verification date. | UTC calendar date only; exact time removed |
| releasedDate | String (YYYY-MM-DD, UTC) | Release date. | UTC calendar date only; exact time removed |
| campus | String | Institutional campus scope. | Retained with sensitive-pattern screening |
| createdAt | String (YYYY-MM-DD, UTC) | Record creation date. | UTC calendar date only; exact time removed |
| updatedAt | String (YYYY-MM-DD, UTC) | Last update date. | UTC calendar date only; exact time removed |
| dataOrigin | String | Origin classification: synthetic, as confirmed by the dataset owner. | Added based on owner confirmation |

## claimschedules

| Field | Export type | Meaning | Treatment |
|---|---|---|---|
| _id | String (alias) | Record identifier replaced with a consistent export-only alias. | Consistent identifier alias; no source-ID mapping supplied |
| allocation | String (alias) | Related allocation reference. | Consistent identifier alias; no source-ID mapping supplied |
| request | String (alias) | Related request reference. | Consistent identifier alias; no source-ID mapping supplied |
| student | String (alias) | Student user reference. | Consistent identifier alias; no source-ID mapping supplied |
| resource | String (alias) | Resource reference; in requests, an aliased resource display label. | Consistent identifier alias; no source-ID mapping supplied |
| pickupDate | String (YYYY-MM-DD, UTC) | Scheduled pickup date. | UTC calendar date only; exact time removed |
| campus | String | Institutional campus scope. | Retained with sensitive-pattern screening |
| status | String | Current account, resource, or workflow state. | Retained with sensitive-pattern screening |
| verifiedBy | String (alias) | Verifying user. | Consistent identifier alias; no source-ID mapping supplied |
| verifiedAt | String (YYYY-MM-DD, UTC) | Verification date. | UTC calendar date only; exact time removed |
| cancelledBy | String (alias) | Cancelling user. | Consistent identifier alias; no source-ID mapping supplied |
| cancelledAt | String (YYYY-MM-DD, UTC) | Cancellation date. | UTC calendar date only; exact time removed |
| quantityClaimed | Number | Units claimed. | Retained with sensitive-pattern screening |
| createdAt | String (YYYY-MM-DD, UTC) | Record creation date. | UTC calendar date only; exact time removed |
| updatedAt | String (YYYY-MM-DD, UTC) | Last update date. | UTC calendar date only; exact time removed |
| dataOrigin | String | Origin classification: synthetic, as confirmed by the dataset owner. | Added based on owner confirmation |

## distributions

| Field | Export type | Meaning | Treatment |
|---|---|---|---|
| _id | String (alias) | Record identifier replaced with a consistent export-only alias. | Consistent identifier alias; no source-ID mapping supplied |
| allocation | String (alias) | Related allocation reference. | Consistent identifier alias; no source-ID mapping supplied |
| request | String (alias) | Related request reference. | Consistent identifier alias; no source-ID mapping supplied |
| claimSchedule | String (alias) | Related claim schedule reference. | Consistent identifier alias; no source-ID mapping supplied |
| student | String (alias) | Student user reference. | Consistent identifier alias; no source-ID mapping supplied |
| resource | String (alias) | Resource reference; in requests, an aliased resource display label. | Consistent identifier alias; no source-ID mapping supplied |
| quantity | Number | Requested, allocated, or distributed units. | Retained with sensitive-pattern screening |
| status | String | Current account, resource, or workflow state. | Retained with sensitive-pattern screening |
| releasedBy | String (alias) | User who released the resource. | Consistent identifier alias; no source-ID mapping supplied |
| releasedAt | String (YYYY-MM-DD, UTC) | Release date. | UTC calendar date only; exact time removed |
| claimedAt | String (YYYY-MM-DD, UTC) | Claim date. | UTC calendar date only; exact time removed |
| verifiedBy | String (alias) | Verifying user. | Consistent identifier alias; no source-ID mapping supplied |
| verifiedAt | String (YYYY-MM-DD, UTC) | Verification date. | UTC calendar date only; exact time removed |
| quantityRequested | Number | Requested units recorded at distribution. | Retained with sensitive-pattern screening |
| quantityDelivered | Number | Delivered units recorded at distribution. | Retained with sensitive-pattern screening |
| campus | String | Institutional campus scope. | Retained with sensitive-pattern screening |
| createdAt | String (YYYY-MM-DD, UTC) | Record creation date. | UTC calendar date only; exact time removed |
| updatedAt | String (YYYY-MM-DD, UTC) | Last update date. | UTC calendar date only; exact time removed |
| dataOrigin | String | Origin classification: synthetic, as confirmed by the dataset owner. | Added based on owner confirmation |

## auditlogs

| Field | Export type | Meaning | Treatment |
|---|---|---|---|
| _id | String (alias) | Record identifier replaced with a consistent export-only alias. | Consistent identifier alias; no source-ID mapping supplied |
| actor | String (alias) | User who performed the audit event. | Consistent identifier alias; no source-ID mapping supplied |
| actorRole | String | Role recorded for the audit actor. | Retained with sensitive-pattern screening |
| action | String | Audit event action code. | Retained with sensitive-pattern screening |
| entity | String | Affected entity type. | Retained with sensitive-pattern screening |
| entityId | String (alias) | Aliased affected entity identifier; target type comes from entity. | Consistent identifier alias; no source-ID mapping supplied |
| previousStatus | String | State before the audit event. | Retained with sensitive-pattern screening |
| newStatus | String | State after the audit event. | Retained with sensitive-pattern screening |
| student | String (alias) | Student user reference. | Consistent identifier alias; no source-ID mapping supplied |
| resource | String (alias) | Resource reference; in requests, an aliased resource display label. | Consistent identifier alias; no source-ID mapping supplied |
| createdAt | String (YYYY-MM-DD, UTC) | Record creation date. | UTC calendar date only; exact time removed |
| updatedAt | String (YYYY-MM-DD, UTC) | Last update date. | UTC calendar date only; exact time removed |
| dataOrigin | String | Origin classification: synthetic, as confirmed by the dataset owner. | Added based on owner confirmation |
