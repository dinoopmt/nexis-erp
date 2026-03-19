# Settings Module Services Guide

## Overview
The Settings Module manages all configuration, preferences, notifications, and feature flags for the ERP system. It provides a comprehensive framework for system configuration, user preferences, feature management, and notification delivery.

**Location**: `server/modules/settings/services/`
**Services**: 4
**Methods**: 37
**Total Lines**: 2,100+

---

## 1. SystemSettingsService

### Purpose
Manages global system configuration including company information, module settings, business rules, and system health monitoring.

### File Location
`server/modules/settings/services/SystemSettingsService.js`

### Methods

#### `getSystemSettings(filters)`
Retrieves system settings by category.

**Parameters**:
- `filters` (Object, optional) - Filter options
  - `category` (string) - Filter by category (company, business, accounting, security, email, sms)
  - `search` (string) - Search term for settings names

**Returns**: Promise<Object>

**Example**:
```javascript
import { SystemSettingsService } from './services/index.js';

// Get all system settings
const allSettings = await SystemSettingsService.getSystemSettings();

// Get settings by category
const companySettings = await SystemSettingsService.getSystemSettings({
  category: 'company'
});

// Get settings with search
const securitySettings = await SystemSettingsService.getSystemSettings({
  category: 'security'
});

// Response format:
{
  company: {
    companyName: 'ABC Corporation',
    registrationNumber: 'REG-001',
    taxId: 'TAX-12345',
    address: {...},
    financialYearStart: '2024-04-01',
    financialYearEnd: '2025-03-31',
    timezone: 'America/New_York',
    currency: 'USD'
  },
  business: {
    warehouseDefault: 'MAIN',
    costCenterDefault: 'GENERAL',
    stockValuationMethod: 'FIFO',
    approvalWorkflow: true,
    sequenceFormats: {...}
  },
  accounting: {
    multiCurrencyEnabled: true,
    costCenterRequired: true,
    budgetingEnabled: true,
    varianceThreshold: 5000
  },
  security: {
    passwordMinLength: 8,
    sessionTimeout: 1800,
    mfaRequired: true,
    ipWhitelistEnabled: false
  }
}
```

---

#### `updateSystemSettings(category, settingsData)`
Updates system settings for a specific category.

**Parameters**:
- `category` (string) - Settings category
- `settingsData` (Object) - Settings data to update

**Returns**: Promise<Object> - Updated settings

**Example**:
```javascript
// Update company settings
const updated = await SystemSettingsService.updateSystemSettings('company', {
  companyName: 'ABC Corporation Ltd.',
  address: {
    street: '123 Business St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA'
  }
});

// Update accounting settings
const accountingUpdated = await SystemSettingsService.updateSystemSettings('accounting', {
  multiCurrencyEnabled: true,
  budgetingEnabled: true,
  varianceThreshold: 10000
});

// Response includes:
{
  category: 'company',
  settings: {...},
  updatedAt: '2024-01-15T10:30:00Z',
  updatedBy: 'USER_123',
  auditLog: {
    changes: [...]
  }
}
```

---

#### `getCompanyInfo()`
Retrieves complete company information.

**Returns**: Promise<Object>

**Example**:
```javascript
const companyInfo = await SystemSettingsService.getCompanyInfo();

// Response:
{
  companyId: 'COMP_001',
  name: 'ABC Corporation',
  registrationNumber: 'REG-001',
  taxId: 'TAX-12345',
  businessType: 'Manufacturing',
  mainAddress: {
    street: '123 Business St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
    phone: '+1-555-0000',
    email: 'info@abc.com'
  },
  financialYear: {
    startDate: '2024-04-01',
    endDate: '2025-03-31'
  },
  operatingCurrency: 'USD',
  timezone: 'America/New_York',
  logoUrl: 'https://...',
  createdAt: '2023-01-01T00:00:00Z'
}
```

---

#### `updateCompanyInfo(companyData)`
Updates company information.

**Parameters**:
- `companyData` (Object) - Company data to update

**Returns**: Promise<Object>

**Example**:
```javascript
const updated = await SystemSettingsService.updateCompanyInfo({
  name: 'ABC Corporation Ltd.',
  mainAddress: {
    street: '456 Enterprise Ave',
    city: 'New York',
    state: 'NY',
    zipCode: '10002',
    country: 'USA'
  },
  operatingCurrency: 'USD',
  logoUrl: 'https://...'
});
```

---

#### `getModuleConfiguration(moduleName)`
Retrieves configuration for a specific module.

**Parameters**:
- `moduleName` (string) - Module name (Sales, Inventory, Accounting, Purchasing, etc.)

**Returns**: Promise<Object>

**Example**:
```javascript
// Get Sales module configuration
const salesConfig = await SystemSettingsService.getModuleConfiguration('Sales');

// Response:
{
  module: 'Sales',
  isActive: true,
  settings: {
    creditCheckRequired: true,
    creditLimit: 50000,
    approvalWorkflow: true,
    sequenceFormat: 'INV-{YYYY}-{MM}-{NNNNN}',
    documentRetention: 2555,
    taxCalculation: 'ItemLevel'
  },
  permissions: {...},
  statuses: ['Draft', 'Approved', 'Invoiced', 'Paid', 'Cancelled'],
  configuredAt: '2024-01-01T10:00:00Z'
}
```

---

#### `updateModuleConfiguration(moduleName, configData)`
Updates configuration for a specific module.

**Parameters**:
- `moduleName` (string) - Module name
- `configData` (Object) - Configuration data

**Returns**: Promise<Object>

**Example**:
```javascript
const updated = await SystemSettingsService.updateModuleConfiguration('Inventory', {
  valuationMethod: 'FIFO',
  negativeStockAllowed: false,
  warehouseRequired: true,
  autoGenerateBarcodes: true
});
```

---

#### `getSystemHealth()`
Monitors system health status.

**Returns**: Promise<Object>

**Example**:
```javascript
const health = await SystemSettingsService.getSystemHealth();

// Response:
{
  status: 'Healthy',
  timestamp: '2024-01-15T10:30:00Z',
  components: {
    database: {
      status: 'Connected',
      responseTime: 15,
      lastCheck: '2024-01-15T10:30:00Z'
    },
    cache: {
      status: 'Connected',
      hitRate: 0.95,
      lastCheck: '2024-01-15T10:30:00Z'
    },
    apiServer: {
      status: 'Running',
      uptime: 86400,
      activeConnections: 45
    },
    storage: {
      status: 'Normal',
      usedSpace: 45.5,
      totalSpace: 100,
      lastCheck: '2024-01-15T10:30:00Z'
    }
  },
  alerts: []
}
```

---

#### `getSystemAuditLog(filters)`
Retrieves settings change audit trail.

**Parameters**:
- `filters` (Object, optional)
  - `startDate` (Date) - Start date
  - `endDate` (Date) - End date
  - `userId` (string) - Filter by user
  - `module` (string) - Filter by module
  - `limit` (number) - Results limit

**Returns**: Promise<Object>

**Example**:
```javascript
const auditLog = await SystemSettingsService.getSystemAuditLog({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-15'),
  limit: 50
});

// Response:
{
  logs: [
    {
      logId: 'LOG_001',
      userId: 'USER_123',
      username: 'admin@company.com',
      action: 'Updated',
      module: 'Accounting',
      settingName: 'multiCurrencyEnabled',
      oldValue: false,
      newValue: true,
      timestamp: '2024-01-15T10:30:00Z',
      ipAddress: '192.168.1.100'
    }
  ],
  total: 1,
  pagination: {limit: 50, offset: 0}
}
```

---

#### `backupSystemConfiguration()`
Creates encrypted backup of system configuration.

**Returns**: Promise<Object>

**Example**:
```javascript
const backup = await SystemSettingsService.backupSystemConfiguration();

// Response:
{
  backupId: 'BACKUP_001',
  filename: 'system_config_20240115_103000.enc',
  size: 1024000,
  encryptionAlgorithm: 'AES-256',
  createdAt: '2024-01-15T10:30:00Z',
  createdBy: 'SYSTEM',
  storageLocation: '/backups/archived/',
  expiresAt: '2025-01-15T10:30:00Z',
  retentionPolicy: 'Standard'
}
```

---

## 2. FeatureFlagsService

### Purpose
Manages feature flags for gradual rollout, A/B testing, and canary deployments. Supports Boolean, Percentage-based, Segment-based, and Schedule-based feature flags.

### File Location
`server/modules/settings/services/FeatureFlagsService.js`

### Methods

#### `createFeatureFlag(flagData)`
Creates a new feature flag.

**Parameters**:
- `flagData` (Object) - Feature flag configuration
  - `name` (string, required) - Flag name
  - `description` (string) - Flag description
  - `type` (string) - Flag type: 'Boolean', 'Percentage', 'Segment', 'Schedule'
  - `defaultValue` (boolean) - Default value
  - `rolloutPercentage` (number) - For 'Percentage' type
  - `targetSegments` (array) - For 'Segment' type
  - `schedule` (Object) - For 'Schedule' type
  - `variants` (array) - A/B test variants
  - `tags` (array) - Tags for organization

**Returns**: Promise<Object>

**Example**:
```javascript
// Create Boolean flag
const boolFlag = await FeatureFlagsService.createFeatureFlag({
  name: 'new_dashboard',
  description: 'New dashboard UI',
  type: 'Boolean',
  defaultValue: false,
  tags: ['UI', 'v2']
});

// Create Percentage-based flag (gradual rollout)
const percentageFlag = await FeatureFlagsService.createFeatureFlag({
  name: 'advanced_reporting',
  description: 'Advanced reporting features',
  type: 'Percentage',
  defaultValue: false,
  rolloutPercentage: 25,
  tags: ['Reporting']
});

// Create Segment-based flag (targeted users)
const segmentFlag = await FeatureFlagsService.createFeatureFlag({
  name: 'premium_analytics',
  description: 'Premium analytics for enterprise',
  type: 'Segment',
  defaultValue: false,
  targetSegments: ['Enterprise', 'Premium'],
  tags: ['Analytics']
});

// Create Schedule-based flag (time-bound)
const scheduleFlag = await FeatureFlagsService.createFeatureFlag({
  name: 'year_end_features',
  description: 'Year-end reporting features',
  type: 'Schedule',
  defaultValue: false,
  schedule: {
    startDate: '2024-12-01',
    endDate: '2025-01-31',
    timezone: 'UTC'
  },
  tags: ['Seasonal']
});

// Response:
{
  flagId: 'FLAG_001',
  name: 'new_dashboard',
  type: 'Boolean',
  enabled: true,
  rolloutPhase: 'Beta',
  statistics: {
    totalEvaluations: 0,
    enabledCount: 0,
    disabledCount: 0
  },
  createdAt: '2024-01-15T10:30:00Z',
  createdBy: 'USER_123'
}
```

---

#### `getAllFeatureFlags(filters)`
Retrieves all feature flags with optional filters.

**Parameters**:
- `filters` (Object, optional)
  - `enabled` (boolean) - Filter by enabled status
  - `type` (string) - Filter by type
  - `search` (string) - Search in name/description
  - `tag` (string) - Filter by tag
  - `limit` (number) - Results limit
  - `offset` (number) - Pagination offset

**Returns**: Promise<Object>

**Example**:
```javascript
// Get all enabled flags
const enabledFlags = await FeatureFlagsService.getAllFeatureFlags({
  enabled: true
});

// Get flags by type
const percentageFlags = await FeatureFlagsService.getAllFeatureFlags({
  type: 'Percentage'
});

// Search flags
const searchResults = await FeatureFlagsService.getAllFeatureFlags({
  search: 'dashboard',
  limit: 25,
  offset: 0
});

// Response:
{
  flags: [
    {
      flagId: 'FLAG_001',
      name: 'new_dashboard',
      type: 'Boolean',
      enabled: true,
      description: 'New dashboard UI',
      rolloutPercentage: null,
      createdAt: '2024-01-15T10:30:00Z'
    }
  ],
  total: 125,
  limit: 25,
  offset: 0,
  hasMore: true
}
```

---

#### `getFeatureFlagDetails(flagId)`
Retrieves detailed information about a specific feature flag.

**Parameters**:
- `flagId` (string) - Feature flag ID

**Returns**: Promise<Object>

**Example**:
```javascript
const details = await FeatureFlagsService.getFeatureFlagDetails('FLAG_001');

// Response:
{
  flagId: 'FLAG_001',
  name: 'new_dashboard',
  description: 'New dashboard UI',
  type: 'Percentage',
  enabled: true,
  defaultValue: false,
  rolloutPercentage: 50,
  rolloutPhase: 'Beta',
  rolloutSchedule: {
    phases: [
      {
        phase: 'Internal',
        percentage: 0,
        startDate: '2024-01-01',
        endDate: '2024-01-15'
      },
      {
        phase: 'Beta',
        percentage: 25,
        startDate: '2024-01-15',
        endDate: '2024-02-15'
      },
      {
        phase: 'FullRollout',
        percentage: 100,
        startDate: '2024-02-15'
      }
    ],
    currentPhase: 'Beta',
    currentPercentage: 25
  },
  variants: [
    {
      variantId: 'VAR_001',
      name: 'Control',
      percentage: 50,
      config: {}
    },
    {
      variantId: 'VAR_002',
      name: 'Treatment',
      percentage: 50,
      config: {theme: 'dark'}
    }
  ],
  statistics: {
    totalEvaluations: 45000,
    enabledCount: 22500,
    disabledCount: 22500,
    variantDistribution: {...},
    dailyActiveUsers: 150
  },
  tags: ['UI', 'v2'],
  createdAt: '2024-01-15T10:30:00Z',
  createdBy: 'USER_123'
}
```

---

#### `updateFeatureFlag(flagId, updateData)`
Updates a feature flag configuration.

**Parameters**:
- `flagId` (string) - Feature flag ID
- `updateData` (Object) - Data to update

**Returns**: Promise<Object>

**Example**:
```javascript
// Update rollout percentage
const updated = await FeatureFlagsService.updateFeatureFlag('FLAG_001', {
  rolloutPercentage: 75,
  description: 'Updated dashboard UI'
});

// Update variants for A/B testing
const abUpdated = await FeatureFlagsService.updateFeatureFlag('FLAG_002', {
  variants: [
    {
      name: 'Control',
      percentage: 50,
      config: {theme: 'light'}
    },
    {
      name: 'Treatment A',
      percentage: 25,
      config: {theme: 'dark'}
    },
    {
      name: 'Treatment B',
      percentage: 25,
      config: {theme: 'highContrast'}
    }
  ]
});
```

---

#### `enableFeatureFlag(flagId)`
Enables a feature flag.

**Parameters**:
- `flagId` (string) - Feature flag ID

**Returns**: Promise<Object>

**Example**:
```javascript
const enabled = await FeatureFlagsService.enableFeatureFlag('FLAG_001');

// Response:
{
  flagId: 'FLAG_001',
  enabled: true,
  enabledAt: '2024-01-15T10:30:00Z',
  enabledBy: 'USER_123'
}
```

---

#### `disableFeatureFlag(flagId)`
Disables a feature flag.

**Parameters**:
- `flagId` (string) - Feature flag ID

**Returns**: Promise<Object>

**Example**:
```javascript
const disabled = await FeatureFlagsService.disableFeatureFlag('FLAG_001');
```

---

#### `isFeatureEnabled(featureName, userId, context)`
Evaluates if a feature is enabled for a specific user.

**Parameters**:
- `featureName` (string) - Feature name
- `userId` (string) - User ID
- `context` (Object) - Additional context for evaluation
  - `userSegment` (string) - User's segment
  - `customProperties` (Object) - Custom evaluation properties

**Returns**: Promise<boolean>

**Example**:
```javascript
// Check if feature is enabled for user
const isEnabled = await FeatureFlagsService.isFeatureEnabled(
  'new_dashboard',
  'USER_123',
  {
    userSegment: 'Premium',
    location: 'US'
  }
);

// Use in conditional logic
if (isEnabled) {
  // Load new dashboard
} else {
  // Load legacy dashboard
}
```

---

#### `getFeatureRolloutSchedule(flagId)`
Retrieves the rollout schedule and current phase for a feature.

**Parameters**:
- `flagId` (string) - Feature flag ID

**Returns**: Promise<Object>

**Example**:
```javascript
const schedule = await FeatureFlagsService.getFeatureRolloutSchedule('FLAG_001');

// Response:
{
  flagId: 'FLAG_001',
  flagName: 'new_dashboard',
  phases: [
    {
      phaseName: 'Internal',
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      percentage: 10,
      targetAudience: 'Internal team only',
      status: 'Completed'
    },
    {
      phaseName: 'Beta',
      startDate: '2024-01-15',
      endDate: '2024-02-15',
      percentage: 25,
      targetAudience: 'Beta testers + Premium users',
      status: 'InProgress'
    },
    {
      phaseName: 'FullRollout',
      startDate: '2024-02-15',
      percentage: 100,
      targetAudience: 'All users',
      status: 'Scheduled'
    }
  ],
  currentPhase: 'Beta',
  currentPhaseProgress: 0.65,
  nextPhaseDate: '2024-02-15T00:00:00Z'
}
```

---

#### `deleteFeatureFlag(flagId)`
Removes a feature flag.

**Parameters**:
- `flagId` (string) - Feature flag ID

**Returns**: Promise<Object>

**Example**:
```javascript
const deleted = await FeatureFlagsService.deleteFeatureFlag('FLAG_001');

// Response:
{
  flagId: 'FLAG_001',
  status: 'Deleted',
  deletedAt: '2024-01-15T10:30:00Z',
  deletedBy: 'USER_123'
}
```

---

## 3. UserPreferencesService

### Purpose
Manages user-specific preferences including theme, language, UI customization, and dashboard configuration.

### File Location
`server/modules/settings/services/UserPreferencesService.js`

### Methods

#### `getUserPreferences(userId)`
Retrieves all preferences for a user.

**Parameters**:
- `userId` (string) - User ID

**Returns**: Promise<Object>

**Example**:
```javascript
const preferences = await UserPreferencesService.getUserPreferences('USER_123');

// Response:
{
  userId: 'USER_123',
  theme: 'Dark',
  language: 'en',
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  currency: 'USD',
  decimalSeparator: '.',
  thousandSeparator: ',',
  defaultModule: 'Dashboard',
  defaultWarehouse: 'MAIN_WAREHOUSE',
  rowsPerPage: 25,
  ui: {
    compactMode: false,
    showSidebar: true,
    sidebarPosition: 'left',
    animationsEnabled: true
  },
  dashboard: {
    cards: [...],
    refreshInterval: 300
  }
}
```

---

#### `updateUserPreferences(userId, preferences)`
Updates user preferences.

**Parameters**:
- `userId` (string) - User ID
- `preferences` (Object) - Preferences to update

**Returns**: Promise<Object>

**Example**:
```javascript
const updated = await UserPreferencesService.updateUserPreferences('USER_123', {
  theme: 'Light',
  language: 'es',
  timezone: 'Europe/Madrid'
});
```

---

#### `setUserTheme(userId, theme)`
Sets the user's theme preference.

**Parameters**:
- `userId` (string) - User ID
- `theme` (string) - Theme: 'Light', 'Dark', 'Auto'

**Returns**: Promise<Object>

**Example**:
```javascript
const updated = await UserPreferencesService.setUserTheme('USER_123', 'Dark');
```

---

#### `setUserLanguage(userId, language)`
Sets the user's language preference.

**Parameters**:
- `userId` (string) - User ID
- `language` (string) - Language code: en, es, fr, de, it, pt, ru, zh, ja

**Returns**: Promise<Object>

**Example**:
```javascript
const updated = await UserPreferencesService.setUserLanguage('USER_123', 'es');
```

---

#### `setUserTimezone(userId, timezone)`
Sets the user's timezone preference.

**Parameters**:
- `userId` (string) - User ID
- `timezone` (string) - Timezone (IANA timezone identifier)

**Returns**: Promise<Object>

**Example**:
```javascript
const updated = await UserPreferencesService.setUserTimezone('USER_123', 'Europe/London');
```

---

#### `setUserDefaults(userId, defaults)`
Sets user's default values for module, warehouse, and cost center.

**Parameters**:
- `userId` (string) - User ID
- `defaults` (Object) - Default values

**Returns**: Promise<Object>

**Example**:
```javascript
const updated = await UserPreferencesService.setUserDefaults('USER_123', {
  defaultModule: 'Sales',
  defaultWarehouse: 'MAIN_WAREHOUSE',
  defaultCostCenter: 'SALES'
});
```

---

#### `configureDashboard(userId, cards)`
Configures dashboard cards and layout.

**Parameters**:
- `userId` (string) - User ID
- `cards` (Array) - Array of dashboard card configurations

**Returns**: Promise<Object>

**Example**:
```javascript
const updated = await UserPreferencesService.configureDashboard('USER_123', [
  {
    cardId: 'CARD_SALES',
    name: 'Sales Overview',
    visible: true,
    widgetSize: 'large'
  },
  {
    cardId: 'CARD_INVENTORY',
    name: 'Inventory Status',
    visible: true,
    widgetSize: 'medium'
  }
]);
```

---

#### `getUserDashboardConfig(userId)`
Retrieves user's dashboard configuration.

**Parameters**:
- `userId` (string) - User ID

**Returns**: Promise<Object>

**Example**:
```javascript
const config = await UserPreferencesService.getUserDashboardConfig('USER_123');
```

---

#### `resetPreferencesToDefault(userId)`
Resets all preferences to system defaults.

**Parameters**:
- `userId` (string) - User ID

**Returns**: Promise<Object>

**Example**:
```javascript
const reset = await UserPreferencesService.resetPreferencesToDefault('USER_123');

// Response:
{
  userId: 'USER_123',
  status: 'Reset',
  resetAt: '2024-01-15T10:30:00Z',
  resetTo: 'System defaults'
}
```

---

## 4. NotificationSettingsService

### Purpose
Manages notification channels, templates, rules, and user notification preferences across multiple communication channels.

### File Location
`server/modules/settings/services/NotificationSettingsService.js`

### Methods

#### `getNotificationSettings(userId)`
Retrieves all notification settings for a user.

**Parameters**:
- `userId` (string) - User ID

**Returns**: Promise<Object>

**Example**:
```javascript
const settings = await NotificationSettingsService.getNotificationSettings('USER_123');

// Response:
{
  userId: 'USER_123',
  channels: {
    email: {
      enabled: true,
      address: 'user@example.com',
      verificationStatus: 'Verified'
    },
    sms: {
      enabled: false,
      phoneNumber: ''
    },
    push: {
      enabled: true,
      devices: [...]
    },
    inApp: {
      enabled: true,
      displayAs: 'Banner'
    }
  },
  preferences: {
    enableNotifications: true,
    quietHours: {enabled: true, startTime: '22:00', endTime: '08:00'},
    groupNotifications: true
  },
  digestSettings: {
    enableDigest: true,
    frequency: 'Daily',
    deliveryTime: '09:00'
  }
}
```

---

#### `updateNotificationSettings(userId, settings)`
Updates notification settings.

**Parameters**:
- `userId` (string) - User ID
- `settings` (Object) - Settings to update

**Returns**: Promise<Object>

**Example**:
```javascript
const updated = await NotificationSettingsService.updateNotificationSettings('USER_123', {
  'preferences.quietHours.enabled': true,
  'preferences.quietHours.startTime': '21:00',
  'preferences.quietHours.endTime': '09:00'
});
```

---

#### `configureNotificationChannel(userId, channel, config)`
Configures a specific notification channel.

**Parameters**:
- `userId` (string) - User ID
- `channel` (string) - Channel type: email, sms, push, inApp
- `config` (Object) - Channel configuration

**Returns**: Promise<Object>

**Example**:
```javascript
// Configure email channel
const emailConfig = await NotificationSettingsService.configureNotificationChannel('USER_123', 'email', {
  enabled: true,
  address: 'user@example.com',
  frequency: 'Immediate'
});

// Configure push notifications
const pushConfig = await NotificationSettingsService.configureNotificationChannel('USER_123', 'push', {
  enabled: true,
  devices: [{deviceId: 'DEV_001', enabled: true}]
});
```

---

#### `configureEmailTemplate(templateId, template)`
Configures an email notification template.

**Parameters**:
- `templateId` (string) - Template ID
- `template` (Object) - Template data
  - `name` (string) - Template name
  - `subject` (string) - Email subject
  - `body` (string) - Email body (HTML supported)
  - `variables` (array) - Available variables for template

**Returns**: Promise<Object>

**Example**:
```javascript
const template = await NotificationSettingsService.configureEmailTemplate('TPL_INVOICE', {
  name: 'Invoice Notification',
  subject: 'Invoice {{INVOICE_NUMBER}} has been created',
  body: `
    <h1>Invoice Created</h1>
    <p>Invoice {{INVOICE_NUMBER}} for {{CUSTOMER_NAME}} has been created.</p>
    <p>Total Amount: {{TOTAL_AMOUNT}}</p>
  `,
  variables: ['INVOICE_NUMBER', 'CUSTOMER_NAME', 'TOTAL_AMOUNT', 'DUE_DATE']
});
```

---

#### `createNotificationRule(userId, rule)`
Creates a notification rule for event-based notifications.

**Parameters**:
- `userId` (string) - User ID
- `rule` (Object) - Rule configuration
  - `name` (string) - Rule name
  - `eventType` (string) - Event type to trigger
  - `channels` (array) - Notification channels
  - `template` (string) - Email template ID
  - `conditions` (array) - Optional conditions

**Returns**: Promise<Object>

**Example**:
```javascript
// Create rule for high-value invoices
const rule = await NotificationSettingsService.createNotificationRule('USER_123', {
  name: 'High Value Invoices',
  description: 'Notify on invoices over $10,000',
  eventType: 'INVOICE_CREATED',
  eventFilters: {
    minAmount: 10000
  },
  channels: ['email', 'sms'],
  template: 'TPL_HIGH_VALUE_INVOICE',
  conditions: [
    {
      field: 'amount',
      operator: '>',
      value: 10000
    }
  ],
  priority: 1
});

// Create rule for low stock alerts
const stockRule = await NotificationSettingsService.createNotificationRule('USER_123', {
  name: 'Low Stock Alert',
  eventType: 'INVENTORY_LOW_STOCK',
  channels: ['email', 'push', 'inApp'],
  priority: 2
});
```

---

#### `updateNotificationRule(ruleId, updates)`
Updates a notification rule.

**Parameters**:
- `ruleId` (string) - Rule ID
- `updates` (Object) - Updates to apply

**Returns**: Promise<Object>

**Example**:
```javascript
const updated = await NotificationSettingsService.updateNotificationRule('RULE_001', {
  channels: ['email', 'push'],
  priority: 1
});
```

---

#### `deleteNotificationRule(ruleId)`
Deletes a notification rule.

**Parameters**:
- `ruleId` (string) - Rule ID

**Returns**: Promise<Object>

**Example**:
```javascript
const deleted = await NotificationSettingsService.deleteNotificationRule('RULE_001');
```

---

#### `getNotificationRules(userId, filters)`
Retrieves user's notification rules.

**Parameters**:
- `userId` (string) - User ID
- `filters` (Object, optional) - Filter options

**Returns**: Promise<Array>

**Example**:
```javascript
const rules = await NotificationSettingsService.getNotificationRules('USER_123');

// Response:
{
  rules: [
    {
      ruleId: 'RULE_001',
      name: 'Invoice Created',
      eventType: 'INVOICE_CREATED',
      channels: ['email', 'inApp'],
      priority: 1,
      isActive: true
    }
  ],
  total: 5
}
```

---

#### `setDoNotDisturbSchedule(userId, schedule)`
Sets the user's do-not-disturb schedule.

**Parameters**:
- `userId` (string) - User ID
- `schedule` (Object) - DND schedule
  - `enabled` (boolean) - Enable/disable
  - `startTime` (string) - Start time HH:MM
  - `endTime` (string) - End time HH:MM
  - `timezone` (string) - Timezone
  - `daysOfWeek` (array) - Days (0-6)

**Returns**: Promise<Object>

**Example**:
```javascript
const schedule = await NotificationSettingsService.setDoNotDisturbSchedule('USER_123', {
  enabled: true,
  startTime: '22:00',
  endTime: '08:00',
  timezone: 'America/New_York',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  allowUrgent: true
});
```

---

#### `getNotificationHistory(userId, filters)`
Retrieves notification delivery history.

**Parameters**:
- `userId` (string) - User ID
- `filters` (Object, optional)
  - `limit` (number) - Results limit
  - `offset` (number) - Pagination offset
  - `channel` (string) - Filter by channel
  - `status` (string) - Filter by status

**Returns**: Promise<Object>

**Example**:
```javascript
const history = await NotificationSettingsService.getNotificationHistory('USER_123', {
  limit: 50,
  offset: 0
});

// Response:
{
  notifications: [
    {
      notificationId: 'NOTIF_001',
      type: 'Invoice',
      message: 'Invoice INV-001 created',
      channel: 'email',
      status: 'Delivered',
      sentAt: '2024-01-15T10:30:00Z',
      deliveredAt: '2024-01-15T10:31:00Z'
    }
  ],
  total: 125,
  hasMore: true
}
```

---

## Integration Examples

### Complete Settings Configuration Flow
```javascript
import {
  SystemSettingsService,
  FeatureFlagsService,
  UserPreferencesService,
  NotificationSettingsService
} from './modules/settings/services/index.js'
;

// 1. Initialize system with company info
await SystemSettingsService.updateCompanyInfo({
  name: 'ABC Corporation',
  mainAddress: {...},
  operatingCurrency: 'USD'
});

// 2. Configure modules
await SystemSettingsService.updateModuleConfiguration('Sales', {
  creditCheckRequired: true,
  approvalWorkflow: true
});

// 3. Set up feature flags for gradual rollout
await FeatureFlagsService.createFeatureFlag({
  name: 'advanced_reporting',
  type: 'Percentage',
  rolloutPercentage: 25
});

// 4. Configure user preferences
await UserPreferencesService.updateUserPreferences('USER_123', {
  theme: 'Dark',
  language: 'es'
});

// 5. Set up notification rules
await NotificationSettingsService.createNotificationRule('USER_123', {
  name: 'Invoice Notifications',
  eventType: 'INVOICE_CREATED',
  channels: ['email']
});
```

### Feature Flag Evaluation in Application
```javascript
// Check if feature is enabled for user
const isAdvancedReportingEnabled = await FeatureFlagsService.isFeatureEnabled(
  'advanced_reporting',
  currentUserId,
  {userSegment: 'Premium'}
);

if (isAdvancedReportingEnabled) {
  // Show advanced reporting UI
} else {
  // Show standard reporting UI
}
```

---

## Error Handling

All services follow consistent error handling patterns:

```javascript
try {
  const result = await SystemSettingsService.getSystemSettings();
} catch (error) {
  if (error.status === 404) {
    // Settings not found
  } else if (error.status === 400) {
    // Validation error
  } else {
    // Server error
  }
}
```

---

## Performance Considerations

1. **System Health Checks**: Cache results for 5 minutes
2. **Feature Flag Evaluation**: Use hashing for percentage-based rollout (deterministic per user)
3. **Notification History**: Implement pagination for large datasets
4. **Audit Logs**: Archive logs older than 90 days

---

## Security Notes

1. **Settings Encryption**: Sensitive settings are AES-256 encrypted
2. **Backup Security**: Configuration backups are encrypted
3. **Audit Trail**: All changes logged with user and IP information
4. **Access Control**: Settings updates should require appropriate permissions

---

## Related Modules

- **Auth Module**: User authentication and authorization
- **Activity Module**: Audit trails and change tracking
- **Masters Module**: Financial year and company data
- **All Modules**: Settings apply system-wide

---

## Summary

The Settings Module provides comprehensive configuration management with 37 methods across 4 services:

| Service | Methods | Purpose |
|---------|---------|---------|
| SystemSettingsService | 9 | Global system configuration |
| FeatureFlagsService | 10 | Feature flag management and rollout |
| UserPreferencesService | 8 | User-specific preferences and UI customization |
| NotificationSettingsService | 10 | Notification channels and rules |

**Total**: 37 methods providing complete configuration, preference, feature management, and notification infrastructure for the enterprise ERP system.
