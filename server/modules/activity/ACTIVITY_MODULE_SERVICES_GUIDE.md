# ACTIVITY Module Services Guide

## Overview

The **Activity Module** provides comprehensive audit trails, activity logging, and change tracking capabilities for enterprise compliance, security, and operational intelligence. It enables complete transaction history tracking, user behavior analysis, and forensic investigation capabilities.

**Module Location**: `server/modules/activity/services/`

**Services**: 4 services | **Methods**: 32 methods | **Code**: 1,600+ lines

---

## Services Architecture

### 1. ActivityLogService
**Purpose**: Log and retrieve all system activities and user actions

**File**: `ActivityLogService.js`
**Methods**: 7

#### Core Methods

##### `logUserActivity(activityData)`
- **Purpose**: Record a user action or system event
- **Parameters**:
  - `activityData`: { userId, action, module, description, resourceType, resourceId, status, ipAddress, userAgent }
  - `status`: Success, Failed, Pending, Cancelled
- **Returns**: Created activity log with timestamp
- **Key Features**:
  - Captures user actions across all modules
  - Records IP address and user agent for security
  - Logs resource-level changes
  - Tracks action status
- **Example**:
  ```javascript
  const activity = await ActivityLogService.logUserActivity({
    userId: 'USER_001',
    action: 'Create',
    module: 'Sales',
    description: 'Created new sales order',
    resourceType: 'SalesOrder',
    resourceId: 'SO_001',
    status: 'Success',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  });
  // Returns: activity log with ID and timestamp
  ```

##### `getUserActivityHistory(userId, filters)`
- **Purpose**: Retrieve all activities performed by a specific user
- **Parameters**:
  - `userId`: User ID
  - `filters`: { limit, fromDate, toDate, action, module, status }
  - `limit`: Maximum records (default 50, max 500)
- **Returns**: Array of activity logs
- **Filtering**:
  - By action type (Create, Update, Delete, etc)
  - By module (Sales, Inventory, Accounting, etc)
  - By status (Success, Failed, Pending)
  - By date range
- **Example**:
  ```javascript
  const history = await ActivityLogService.getUserActivityHistory('USER_001', {
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    action: 'Create',
    module: 'Sales',
    limit: 100
  });
  // Returns: user's creation activities in Sales module
  ```

##### `getAllSystemActivities(filters)`
- **Purpose**: Retrieve all system activities across all users
- **Parameters**:
  - `filters`: { userId, action, module, status, limit, fromDate, toDate }
  - `limit`: Maximum records (default 100, max 1000)
- **Returns**: Array of all system activities
- **Use Cases**:
  - System-wide audit trail
  - Compliance reporting
  - Security monitoring
  - Usage analytics
- **Example**:
  ```javascript
  const allActivities = await ActivityLogService.getAllSystemActivities({
    module: 'Accounting',
    status: 'Failed',
    limit: 200
  });
  // Returns: all failed activities in Accounting module
  ```

##### `getActivityStatistics(filters)`
- **Purpose**: Get aggregated statistics on system activities
- **Parameters**:
  - `filters`: { fromDate, toDate, groupBy }
  - `groupBy`: action, module, user (default action)
- **Returns**: Statistics object with counts and percentages
- **Statistics Provided**:
  - Total activities count
  - Success/failure counts and rates
  - Activity distribution by type (action, module, user)
  - Peak usage times
  - Average activities per user
- **Example**:
  ```javascript
  const stats = await ActivityLogService.getActivityStatistics({
    fromDate: '2024-01-01',
    toDate: '2024-12-31'
  });
  // Returns: 1250 total activities, 96% success rate, top actions/modules
  ```

##### `searchActivities(searchParams)`
- **Purpose**: Search activities by multiple criteria
- **Parameters**:
  - `searchParams`: { keyword, userId, action, module, limit }
  - `keyword`: Search in description or resource
- **Returns**: Matching activities
- **Example**:
  ```javascript
  const results = await ActivityLogService.searchActivities({
    keyword: 'sales order',
    module: 'Sales',
    limit: 50
  });
  // Returns: activities matching 'sales order' keyword
  ```

##### `exportActivityLogs(filters)`
- **Purpose**: Export activity logs to file
- **Parameters**:
  - `filters`: { fromDate, toDate, userId, module, format }
  - `format`: CSV, Excel, JSON
- **Returns**: Export file reference with metadata
- **Features**:
  - Multiple format options
  - Date range selection
  - User and module filtering
  - File size and expiration info
- **Example**:
  ```javascript
  const export = await ActivityLogService.exportActivityLogs({
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    module: 'Accounting',
    format: 'Excel'
  });
  // Returns: Excel file with all activities
  ```

##### `cleanupOldActivityLogs(retentionDays)`
- **Purpose**: Delete old activity logs to manage storage
- **Parameters**:
  - `retentionDays`: Days to retain (minimum 30)
- **Returns**: Cleanup statistics
- **Example**:
  ```javascript
  const result = await ActivityLogService.cleanupOldActivityLogs(90);
  // Returns: 5240 records deleted, 15.5 MB freed
  ```

---

### 2. AuditTrailService
**Purpose**: Track detailed changes to entities with before/after values

**File**: `AuditTrailService.js`
**Methods**: 8

#### Core Methods

##### `recordEntityChange(changeData)`
- **Purpose**: Record detailed change to entity with before/after values
- **Parameters**:
  - `changeData`: { entityType, entityId, action, userId, beforeValues, afterValues, changedFields, description, ipAddress }
  - `action`: Create, Update, Delete, Restore
- **Returns**: Audit record with change summary
- **Key Features**:
  - Captures before and after values
  - Records changed field names
  - Automatic change summary generation
  - User and IP address tracking
- **Example**:
  ```javascript
  const audit = await AuditTrailService.recordEntityChange({
    entityType: 'SalesOrder',
    entityId: 'SO_001',
    action: 'Update',
    userId: 'USER_001',
    beforeValues: { status: 'Draft', amount: 1000 },
    afterValues: { status: 'Approved', amount: 1500 },
    changedFields: ['status', 'amount'],
    ipAddress: '192.168.1.1'
  });
  // Returns: audit record with 2 fields modified
  ```

##### `getEntityAuditTrail(entityType, entityId, filters)`
- **Purpose**: Get complete audit trail for an entity
- **Parameters**:
  - `entityType`: Type of entity
  - `entityId`: Entity ID
  - `filters`: { limit, fromDate, toDate, action }
- **Returns**: Array of audit records for entity
- **Example**:
  ```javascript
  const trail = await AuditTrailService.getEntityAuditTrail('Invoice', 'INV_001', {
    limit: 50
  });
  // Returns: all changes to invoice INV_001
  ```

##### `getFieldChangeHistory(entityType, entityId, fieldName)`
- **Purpose**: Track history of a specific field
- **Parameters**:
  - `entityType`: Type of entity
  - `entityId`: Entity ID
  - `fieldName`: Name of field to track
- **Returns**: Chronological change history for field
- **Example**:
  ```javascript
  const history = await AuditTrailService.getFieldChangeHistory(
    'SalesOrder', 'SO_001', 'status'
  );
  // Returns: Draft → Approved → Posted changes
  ```

##### `getMostActiveUsers(filters)`
- **Purpose**: Get users who made most entity changes
- **Parameters**:
  - `filters`: { fromDate, toDate, limit, entityType }
  - `limit`: Top N users (default 20)
- **Returns**: User list with change counts
- **Example**:
  ```javascript
  const users = await AuditTrailService.getMostActiveUsers({
    limit: 10
  });
  // Returns: top 10 most active users with change counts
  ```

##### `compareEntityVersions(entityType, entityId, auditId1, auditId2)`
- **Purpose**: Compare two versions of an entity
- **Parameters**:
  - `entityType`: Type of entity
  - `entityId`: Entity ID
  - `auditId1`: First audit record ID
  - `auditId2`: Second audit record ID
- **Returns**: Detailed comparison with differences
- **Features**:
  - Lists all differences between versions
  - Identifies unchanged fields
  - Shows change count
- **Example**:
  ```javascript
  const comparison = await AuditTrailService.compareEntityVersions(
    'SalesOrder', 'SO_001', 'AUD_001', 'AUD_002'
  );
  // Returns: 2 fields different, 8 fields similar
  ```

##### `generateAuditReport(filters)`
- **Purpose**: Generate comprehensive audit report
- **Parameters**:
  - `filters`: { fromDate, toDate, entityType, userId, action, includeDetails }
- **Returns**: Audit report with summary and details
- **Report Includes**:
  - Total changes count
  - Changes by entity type
  - Changes by user
  - Risk assessment (high-risk changes, bulk deletions)
  - Unauthorized attempts tracking
- **Example**:
  ```javascript
  const report = await AuditTrailService.generateAuditReport({
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    entityType: 'Invoice'
  });
  // Returns: comprehensive audit report
  ```

##### `detectChangeAnomalies(filters)`
- **Purpose**: Detect unusual patterns in entity changes
- **Parameters**:
  - `filters`: { fromDate, toDate, sensitivityLevel }
  - `sensitivityLevel`: Low, Medium, High
- **Returns**: Array of detected anomalies
- **Detects**:
  - Bulk delete operations
  - Unusual access patterns
  - After-hours changes
  - Exceptional modification patterns
- **Example**:
  ```javascript
  const anomalies = await AuditTrailService.detectChangeAnomalies({
    sensitivityLevel: 'High'
  });
  // Returns: detected anomalies with risk levels
  ```

---

### 3. UserActivityService
**Purpose**: Track user-specific actions and behavioral patterns

**File**: `UserActivityService.js`
**Methods**: 8

#### Core Methods

##### `recordUserLogin(loginData)`
- **Purpose**: Record user login session
- **Parameters**:
  - `loginData`: { userId, ipAddress, userAgent, location }
- **Returns**: Session record with sessionId
- **Key Features**:
  - IP address and location tracking
  - User agent capture
  - Session status management
  - Activity counters
- **Example**:
  ```javascript
  const session = await UserActivityService.recordUserLogin({
    userId: 'USER_001',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    location: 'New York'
  });
  // Returns: active session record
  ```

##### `recordUserLogout(sessionId)`
- **Purpose**: Record user logout and end session
- **Parameters**:
  - `sessionId`: Session ID from login
- **Returns**: Logout record with session duration
- **Example**:
  ```javascript
  const logout = await UserActivityService.recordUserLogout('SES_001');
  // Returns: session closed with total activity count
  ```

##### `getUserSessions(userId, filters)`
- **Purpose**: Get all sessions for a user
- **Parameters**:
  - `userId`: User ID
  - `filters`: { limit, fromDate, toDate, status }
  - `status`: Active, Closed
- **Returns**: Array of user sessions
- **Example**:
  ```javascript
  const sessions = await UserActivityService.getUserSessions('USER_001', {
    status: 'Active'
  });
  // Returns: active sessions for user
  ```

##### `getUserDailyActivitySummary(userId, filters)`
- **Purpose**: Get daily breakdown of user activities
- **Parameters**:
  - `userId`: User ID
  - `filters`: { fromDate, toDate }
- **Returns**: Daily activity summary array
- **Summary Includes**:
  - Total activities per day
  - Login count and session duration
  - Success/failure counts
  - Operations breakdown (Create/Read/Update/Delete)
  - Top module used
- **Example**:
  ```javascript
  const daily = await UserActivityService.getUserDailyActivitySummary('USER_001', {
    fromDate: '2024-12-01',
    toDate: '2024-12-31'
  });
  // Returns: daily activity summary for December
  ```

##### `getUserBehavioralAnalytics(userId)`
- **Purpose**: Analyze user behavior and patterns
- **Parameters**:
  - `userId`: User ID
- **Returns**: Comprehensive behavioral analytics
- **Analytics Include**:
  - Activity frequency and patterns
  - Preferred modules and times
  - Operation distribution
  - Error rates and corrections
  - Accuracy and efficiency scores
  - Risk profile assessment
- **Example**:
  ```javascript
  const behavior = await UserActivityService.getUserBehavioralAnalytics('USER_001');
  // Returns: behavior patterns, risk profile, efficiency metrics
  ```

##### `getUserTeamComparison(userId, teamId)`
- **Purpose**: Compare user metrics to team average
- **Parameters**:
  - `userId`: User ID
  - `teamId`: Team ID
- **Returns**: Comparison metrics and rankings
- **Comparison Shows**:
  - User vs team average metrics
  - User ranking within team
  - Above/below average indicators
  - Performance tiers
- **Example**:
  ```javascript
  const comparison = await UserActivityService.getUserTeamComparison('USER_001', 'TEAM_SALES');
  // Returns: user ranked #2 in team, above average in productivity
  ```

##### `detectUserAnomalies(userId)`
- **Purpose**: Detect unusual behavior patterns for user
- **Parameters**:
  - `userId`: User ID
- **Returns**: Array of detected anomalies
- **Detects**:
  - Unusual login times
  - High failure rates
  - Excessive activity
  - Access pattern changes
  - Policy violations
- **Example**:
  ```javascript
  const anomalies = await UserActivityService.detectUserAnomalies('USER_001');
  // Returns: detected anomalies with severities
  ```

##### `getUserProductivityDashboard(userId, filters)`
- **Purpose**: Get comprehensive productivity metrics
- **Parameters**:
  - `userId`: User ID
  - `filters`: { fromDate, toDate, includeComparison }
- **Returns**: Productivity dashboard metrics
- **Metrics Include**:
  - Total activities and period growth
  - Success rate and efficiency
  - Tasks completed on-time percentage
  - Data processed volume
  - Quality and accuracy scores
- **Example**:
  ```javascript
  const dashboard = await UserActivityService.getUserProductivityDashboard('USER_001', {
    fromDate: '2024-12-01',
    toDate: '2024-12-31'
  });
  // Returns: productivity metrics with 97.9% on-time rate
  ```

---

### 4. ChangeHistoryService
**Purpose**: Manage historical versions and snapshots of entities

**File**: `ChangeHistoryService.js`
**Methods**: 9

#### Core Methods

##### `createEntitySnapshot(snapshotData)`
- **Purpose**: Create a point-in-time snapshot of entity
- **Parameters**:
  - `snapshotData`: { entityType, entityId, entityData, userId, reason, version }
- **Returns**: Snapshot record with snapshotId
- **Key Features**:
  - Complete entity state capture
  - Version numbering
  - User and reason tracking
  - Data size calculation
- **Example**:
  ```javascript
  const snapshot = await ChangeHistoryService.createEntitySnapshot({
    entityType: 'SalesOrder',
    entityId: 'SO_001',
    entityData: { status: 'Approved', amount: 1500 },
    userId: 'USER_001',
    reason: 'Post approval',
    version: 2
  });
  // Returns: snapshot with ID and data size
  ```

##### `getEntitySnapshots(entityType, entityId, filters)`
- **Purpose**: Get all snapshots for an entity
- **Parameters**:
  - `entityType`: Type of entity
  - `entityId`: Entity ID
  - `filters`: { limit, fromDate, toDate, includeData }
- **Returns**: Array of snapshots
- **Example**:
  ```javascript
  const snapshots = await ChangeHistoryService.getEntitySnapshots(
    'Invoice', 'INV_001',
    { limit: 50, includeData: true }
  );
  // Returns: all versions of invoice with data
  ```

##### `restoreEntityFromSnapshot(snapshotId, userId)`
- **Purpose**: Restore entity to state captured in snapshot
- **Parameters**:
  - `snapshotId`: Snapshot ID to restore from
  - `userId`: User performing restoration
- **Returns**: Restoration result with restored data
- **Safety Features**:
  - Audit trail for restoration
  - User accountability tracking
  - Original data preservation
- **Example**:
  ```javascript
  const restore = await ChangeHistoryService.restoreEntityFromSnapshot(
    'SNP_002', 'USER_ADMIN'
  );
  // Returns: entity restored with restoration ID
  ```

##### `getVersionHistory(entityType, entityId)`
- **Purpose**: Get chronological version history
- **Parameters**:
  - `entityType`: Type of entity
  - `entityId`: Entity ID
- **Returns**: Ordered version history with metadata
- **History Shows**:
  - Version number and date
  - Creator user
  - Action performed
  - Changed fields count
  - Data integrity hash
- **Example**:
  ```javascript
  const history = await ChangeHistoryService.getVersionHistory(
    'SalesOrder', 'SO_001'
  );
  // Returns: versions 1, 2, 3 with actions
  ```

##### `compareVersions(entityType, entityId, version1, version2)`
- **Purpose**: Compare two specific versions
- **Parameters**:
  - `entityType`: Type of entity
  - `entityId`: Entity ID
  - `version1`: Version number
  - `version2`: Version number
- **Returns**: Detailed version comparison
- **Comparison Shows**:
  - Differences with old/new values
  - Identical fields
  - Difference count
- **Example**:
  ```javascript
  const comparison = await ChangeHistoryService.compareVersions(
    'SalesOrder', 'SO_001', 1, 2
  );
  // Returns: 2 modified fields, 4 unchanged
  ```

##### `getChangeTimeline(entityType, entityId)`
- **Purpose**: Get visual timeline of changes
- **Parameters**:
  - `entityType`: Type of entity
  - `entityId`: Entity ID
- **Returns**: Chronological change timeline
- **Timeline Shows**:
  - Sequential changes with dates
  - User responsible for each change
  - Plain-language change description
  - Status at each step
- **Example**:
  ```javascript
  const timeline = await ChangeHistoryService.getChangeTimeline(
    'Invoice', 'INV_001'
  );
  // Returns: Created → Updated → Approved → Posted
  ```

##### `archiveOldVersions(archiveConfig)`
- **Purpose**: Archive old versions to reduce storage
- **Parameters**:
  - `archiveConfig`: { entityType, entityId, retainVersions, deleteOlderThanDays }
  - `retainVersions`: Latest versions to keep (default 10)
  - `deleteOlderThanDays`: Archive if older than days (default 365)
- **Returns**: Archive result with statistics
- **Example**:
  ```javascript
  const archive = await ChangeHistoryService.archiveOldVersions({
    entityType: 'Invoice',
    entityId: 'INV_001',
    retainVersions: 10,
    deleteOlderThanDays: 365
  });
  // Returns: 45 versions archived, 12.3 MB freed
  ```

##### `getSnapshotDiff(snapshotId1, snapshotId2)`
- **Purpose**: Get formatted diff between two snapshots
- **Parameters**:
  - `snapshotId1`: First snapshot ID
  - `snapshotId2`: Second snapshot ID
- **Returns**: Formatted difference report
- **Diff Shows**:
  - Fields added/removed
  - Fields modified with values
  - Unchanged fields list
  - Summary text
- **Example**:
  ```javascript
  const diff = await ChangeHistoryService.getSnapshotDiff('SNP_001', 'SNP_002');
  // Returns: 2 modified, 2 added, 1 removed fields
  ```

---

## Complete Usage Example

### Scenario: Comprehensive Audit Trail for Finance Document

```javascript
import {
  ActivityLogService,
  AuditTrailService,
  UserActivityService,
  ChangeHistoryService
} from './services/index.js';

// 1. Record user login
const session = await UserActivityService.recordUserLogin({
  userId: 'USER_FINANCE_001',
  ipAddress: '192.168.1.100',
  userAgent: 'Chrome/120',
  location: 'New York Office'
});

// 2. Record initial activity
await ActivityLogService.logUserActivity({
  userId: 'USER_FINANCE_001',
  action: 'Create',
  module: 'Accounting',
  description: 'Created journal entry',
  resourceType: 'JournalEntry',
  resourceId: 'JE_001',
  status: 'Success',
  ipAddress: '192.168.1.100',
  sessionId: session.sessionId
});

// 3. Create first snapshot
const snapshot1 = await ChangeHistoryService.createEntitySnapshot({
  entityType: 'JournalEntry',
  entityId: 'JE_001',
  entityData: { status: 'Draft', debitTotal: 1000, creditTotal: 1000 },
  userId: 'USER_FINANCE_001',
  reason: 'Initial creation',
  version: 1
});

// 4. Record detailed change
const audit1 = await AuditTrailService.recordEntityChange({
  entityType: 'JournalEntry',
  entityId: 'JE_001',
  action: 'Create',
  userId: 'USER_FINANCE_001',
  beforeValues: {},
  afterValues: { status: 'Draft', debitTotal: 1000 },
  changedFields: ['status', 'debitTotal', 'creditTotal']
});

// 5. After approval
await ActivityLogService.logUserActivity({
  userId: 'USER_MANAGER_001',
  action: 'Update',
  module: 'Accounting',
  description: 'Approved journal entry',
  resourceType: 'JournalEntry',
  resourceId: 'JE_001',
  status: 'Success'
});

// 6. Create approval snapshot
const snapshot2 = await ChangeHistoryService.createEntitySnapshot({
  entityType: 'JournalEntry',
  entityId: 'JE_001',
  entityData: { status: 'Approved', debitTotal: 1000, creditTotal: 1000 },
  userId: 'USER_MANAGER_001',
  reason: 'Post approval',
  version: 2
});

// 7. Record change
const audit2 = await AuditTrailService.recordEntityChange({
  entityType: 'JournalEntry',
  entityId: 'JE_001',
  action: 'Update',
  userId: 'USER_MANAGER_001',
  beforeValues: { status: 'Draft' },
  afterValues: { status: 'Approved' },
  changedFields: ['status']
});

// 8. Get complete audit trail
const trail = await AuditTrailService.getEntityAuditTrail('JournalEntry', 'JE_001');

// 9. Get chronological timeline
const timeline = await ChangeHistoryService.getChangeTimeline('JournalEntry', 'JE_001');

// 10. Compare versions
const comparison = await ChangeHistoryService.compareVersions(
  'JournalEntry', 'JE_001', 1, 2
);

// 11. Get user activity summary
const userActivity = await UserActivityService.getUserActivityHistory('USER_FINANCE_001', {
  module: 'Accounting'
});

// 12. Detect any anomalies
const anomalies = await AuditTrailService.detectChangeAnomalies({
  sensitivityLevel: 'High'
});

// 13. Generate compliance audit report
const auditReport = await AuditTrailService.generateAuditReport({
  fromDate: '2024-01-01',
  toDate: '2024-12-31',
  entityType: 'JournalEntry'
});

// 14. Record logout
await UserActivityService.recordUserLogout(session.sessionId);
```

---

## Integration Points

### With Other Modules

**All Modules**:
- Tracks activities for every module
- Records entity changes for all module entities
- Captures user behavior across system

**Accounting Module**:
- Detailed audit of journal entries
- Version history for financial adjustments
- Change investigation for discrepancies

**Sales & Purchasing**:
- Order approval tracking
- Amendment history
- Rejection and resubmission audit trail

**Inventory**:
- Stock adjustment history
- Cost change tracking
- Variance investigation trail

**Customers & Vendors**:
- Master data change tracking
- Credit limit modification history
- Relationship evolution timeline

---

## Compliance & Audit Features

### Regulatory Requirements Support
1. **Audit Trials**: Complete transaction history with timestamps
2. **User Accountability**: Every change tracked to user
3. **Change Details**: Before/after values for all modifications
4. **Immutable Records**: Archive capabilities with integrity checks
5. **Access Control**: IP address and session tracking
6. **Anomaly Detection**: Risk assessment and pattern analysis

### Data Integrity
- Data hash values for change verification
- Snapshot comparison for validation
- Timeline chronological verification
- Rollback capability with audit trail

### Forensic Investigation
- Complete change history reconstruction
- User behavior pattern analysis
- Resource-level tracking
- Time-based filtering and searching

---

## Configuration

### Activity Logging
- **Levels**: All user actions captured
- **Details**: IP, timestamp, user agent, session ID
- **Status**: Success/Failed/Pending tracking
- **Modules**: Every module activity logged

### Audit Trail
- **Granularity**: Field-level change tracking
- **Values**: Before/after capture
- **Actions**: Create, Update, Delete, Restore
- **Investigation**: Anomaly detection and pattern analysis

### User Activity
- **Sessions**: Login/logout tracking
- **Behavior**: Pattern analysis and metrics
- **Comparison**: Team and peer benchmarking
- **Anomalies**: Unusual pattern detection

### Change History
- **Snapshots**: Point-in-time capture
- **Versions**: Sequential versioning
- **Diff**: Detailed comparison capability
- **Timeline**: Visual change progression

---

## Security Considerations

- **Access Control**: Audit data is sensitive (role-based access required)
- **User Agent**: Browser/device identification
- **IP Address**: Network source tracking
- **Session Management**: Session lifecycle tracking
- **Anomaly Detection**: Security risk identification
- **Data Privacy**: Personal activity data handling compliance

---

## Performance & Storage

- **Activity Logging**: Minimal overhead, async logging recommended
- **Snapshots**: Compression for old versions
- **Cleanup**: Automatic retention policy management
- **Archives**: Moved to separate storage after retention
- **Indexing**: Database indexes on userId, timestamp, entityId

---

## Error Handling

All services implement standardized error handling:

```javascript
try {
  const trail = await AuditTrailService.getEntityAuditTrail('Invoice', 'INV_001');
} catch (error) {
  // Status codes: 400 (bad request), 404 (not found), 500 (server error)
  // All errors logged with context
}
```

---

## Next Steps

1. **Implement Controllers**: Create REST endpoints for activity tracking
2. **Add Validators**: Validate activity and audit parameters
3. **Create Middleware**: Activity logging middleware for all requests
4. **Setup Routes**: Define API endpoints for activity module
5. **Add Testing**: Unit and integration tests for all services
6. **Configure Cron Jobs**: Cleanup and archival automation
7. **Setup Notifications**: Alert on high-risk activities
8. **Create Dashboards**: Activity and audit dashboards
9. **Implement Search**: Full-text search on activity descriptions
10. **Export Capability**: Built-in export for compliance reporting
