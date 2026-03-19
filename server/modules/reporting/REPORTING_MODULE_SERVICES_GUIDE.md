# REPORTING Module Services Guide

## Overview

The **Reporting Module** provides comprehensive financial and operational reporting capabilities with automated scheduling, multi-format export, and advanced analysis tools. It includes 4 specialized services supporting decision-making across the enterprise.

**Module Location**: `server/modules/reporting/services/`

**Services**: 4 services | **Methods**: 26 methods | **Code**: 1,500+ lines

---

## Services Architecture

### 1. FinancialReportService
**Purpose**: Generate financial statements and accounting reports

**File**: `FinancialReportService.js`
**Methods**: 7

#### Core Methods

##### `generateIncomeStatement(filters)`
- **Purpose**: Generate profit & loss statement
- **Parameters**:
  - `filters`: { fromDate, toDate, costCenter, includeRatios }
- **Returns**: Financial report object with structured income statement
- **Key Features**:
  - Revenue and COGS calculation
  - Operating expenses, financing costs
  - Profitability ratios (Gross, Operating, Net Margin)
  - Comparisons with prior periods
- **Example**:
  ```javascript
  const income = await FinancialReportService.generateIncomeStatement({
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    includeRatios: true
  });
  // Returns: revenues, COGS, gross profit, net income, key ratios
  ```

##### `generateBalanceSheet(filters)`
- **Purpose**: Generate balance sheet statement
- **Parameters**:
  - `filters`: { asOfDate, includeValidation, comparePrior }
- **Returns**: Balance sheet with assets, liabilities, equity
- **Key Features**:
  - Asset categorization (current, fixed, intangible)
  - Liability classification (current, non-current)
  - Equity breakdown
  - Balance sheet equation verification
  - Working capital analysis
- **Example**:
  ```javascript
  const balanceSheet = await FinancialReportService.generateBalanceSheet({
    asOfDate: '2024-12-31',
    includeValidation: true
  });
  // Returns: assets, liabilities, equity with balance checks
  ```

##### `generateCashFlowStatement(filters)`
- **Purpose**: Generate cash flow statement
- **Parameters**:
  - `filters`: { fromDate, toDate, detailed, includeAnalysis }
- **Returns**: Cash flow with operating, investing, financing activities
- **Key Features**:
  - Operating cash flow (indirect method)
  - Investing activities (capex, investments)
  - Financing activities (borrowing, dividends)
  - Free cash flow calculation
  - Cash position analysis
- **Example**:
  ```javascript
  const cash = await FinancialReportService.generateCashFlowStatement({
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    detailed: true
  });
  // Returns: operating, investing, financing flows with analysis
  ```

##### `generateTrialBalance(filters)`
- **Purpose**: Generate account-level trial balance
- **Parameters**:
  - `filters`: { asOfDate, accountGroup, includeZeroBalance }
- **Returns**: Debit/credit listing with GL accounts
- **Key Features**:
  - All GL accounts with balances
  - Debit/credit verification
  - Account group subtotals
  - Balance reconciliation
- **Example**:
  ```javascript
  const trial = await FinancialReportService.generateTrialBalance({
    asOfDate: '2024-12-31',
    includeZeroBalance: false
  });
  // Returns: accounts with debit/credit balances
  ```

##### `generateFinancialRatiosReport(filters)`
- **Purpose**: Calculate and analyze financial ratios
- **Parameters**:
  - `filters`: { fromDate, toDate, ratioCategories }
- **Returns**: 25+ financial ratios across 5 categories
- **Key Ratios**:
  - **Profitability**: Gross Margin, Operating Margin, Net Margin, ROA, ROE
  - **Liquidity**: Current Ratio, Quick Ratio, Cash Ratio, Working Capital
  - **Solvency**: Debt Ratio, Interest Coverage, Debt-to-Equity
  - **Efficiency**: Asset Turnover, Inventory Turnover, Receivables Days
  - **Growth**: Revenue Growth, Net Income Growth, Market Growth
- **Example**:
  ```javascript
  const ratios = await FinancialReportService.generateFinancialRatiosReport({
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    ratioCategories: ['Profitability', 'Liquidity', 'Solvency']
  });
  // Returns: all ratios with benchmark comparisons
  ```

##### `generateDepartmentalReport(costCenter, filters)`
- **Purpose**: Generate cost center or department financial report
- **Parameters**:
  - `costCenter`: Cost center ID or code
  - `filters`: { fromDate, toDate, includeVariance, includeBudget }
- **Returns**: Department-level P&L and budget analysis
- **Key Features**:
  - Cost center revenues and expenses
  - Budget vs actual variance
  - Performance metrics
  - Department rankings
- **Example**:
  ```javascript
  const dept = await FinancialReportService.generateDepartmentalReport('SALES-01', {
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    includeBudget: true
  });
  // Returns: department P&L with variance analysis
  ```

##### `generateConsolidatedStatements(subsidiaries, filters)`
- **Purpose**: Consolidate financial statements from multiple entities
- **Parameters**:
  - `subsidiaries`: Array of subsidiary IDs
  - `filters`: { fromDate, toDate, eliminateIntercompany, minority }
- **Returns**: Consolidated financial statements
- **Key Features**:
  - Multi-entity aggregation
  - Intercompany elimination
  - Minority interest adjustments
  - Consolidation adjustments journal
- **Example**:
  ```javascript
  const consolidated = await FinancialReportService.generateConsolidatedStatements(
    ['SUB_001', 'SUB_002'],
    { fromDate: '2024-01-01', toDate: '2024-12-31' }
  );
  // Returns: consolidated P&L and balance sheet
  ```

---

### 2. ManagementReportService
**Purpose**: Generate operational and analytical reports for management decision-making

**File**: `ManagementReportService.js`
**Methods**: 6

#### Core Methods

##### `generateSalesAnalysis(filters)`
- **Purpose**: Analyze sales performance across multiple dimensions
- **Parameters**:
  - `filters`: { fromDate, toDate, byCategory, byRegion, byProduct, topCustomers }
- **Returns**: Multi-dimensional sales analysis
- **Key Features**:
  - Sales by product category
  - Sales by geographic region
  - Top products and customers
  - Sales trends and seasonality
  - Customer concentration analysis
- **Example**:
  ```javascript
  const sales = await ManagementReportService.generateSalesAnalysis({
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    byCategory: true,
    byRegion: true,
    topCustomers: 10
  });
  // Returns: sales breakdown with trends
  ```

##### `generateInventoryAnalysis(filters)`
- **Purpose**: Analyze inventory health and performance
- **Parameters**:
  - `filters`: { warehouseId, ageThreshold, includeObsolete, lowStockThreshold }
- **Returns**: Inventory status and metrics
- **Key Features**:
  - Fast-moving vs slow-moving inventory
  - Low stock alerts
  - Obsolete stock identification
  - Inventory turnover analysis
  - Stock aging reports
  - Excess inventory detection
- **Example**:
  ```javascript
  const inventory = await ManagementReportService.generateInventoryAnalysis({
    warehouseId: 'WH_001',
    includeObsolete: true,
    lowStockThreshold: 10
  });
  // Returns: stock health, turnover, obsolescence
  ```

##### `generateCustomerAnalysis(filters)`
- **Purpose**: Analyze customer base and behavior
- **Parameters**:
  - `filters`: { fromDate, toDate, segmentBy, includeRFM, includeLTV }
- **Returns**: Customer segmentation and metrics
- **Key Features**:
  - Customer segmentation (value, age, credit)
  - RFM analysis (Recency, Frequency, Monetary)
  - Lifetime value calculation
  - Churn risk analysis
  - Retention metrics
  - Customer concentration
- **Example**:
  ```javascript
  const customers = await ManagementReportService.generateCustomerAnalysis({
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    includeRFM: true,
    includeLTV: true
  });
  // Returns: segmentation, RFM, LTV analysis
  ```

##### `generateKPIDashboard(filters)`
- **Purpose**: Generate KPI dashboard with targets and variances
- **Parameters**:
  - `filters`: { fromDate, toDate, departments, includeVariance, compareTarget }
- **Returns**: 25+ KPIs with performance metrics
- **Key KPIs**:
  - Revenue KPIs: Total Revenue, Revenue Growth, Revenue per Employee
  - Profitability: Gross Margin %, Operating Margin %, Net Margin %
  - Customer KPIs: Customer Acquisition Cost, Customer Lifetime Value, Churn Rate
  - Sales KPIs: Sales per Salesperson, Conversion Rate, Average Order Value
  - Inventory KPIs: Inventory Turnover, Days Inventory Outstanding, Stock Accuracy
  - Operational KPIs: Order Fill Rate, On-time Delivery, Quality Defect Rate
- **Example**:
  ```javascript
  const kpis = await ManagementReportService.generateKPIDashboard({
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    compareTarget: true
  });
  // Returns: all KPIs with targets and variance
  ```

##### `generateProductionReport(filters)`
- **Purpose**: Report on production performance and metrics
- **Parameters**:
  - `filters`: { fromDate, toDate, productionOrder, includeCost, includeQuality }
- **Returns**: Production metrics and analysis
- **Key Features**:
  - Production orders summary
  - Production efficiency metrics
  - Yield and loss analysis
  - Machine/resource utilization
  - Quality metrics and defects
  - Production cost analysis
- **Example**:
  ```javascript
  const production = await ManagementReportService.generateProductionReport({
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    includeCost: true,
    includeQuality: true
  });
  // Returns: production metrics and efficiency
  ```

##### `generateBudgetVarianceReport(filters)`
- **Purpose**: Analyze budget vs actual performance
- **Parameters**:
  - `filters`: { fromDate, toDate, budgetVersion, byCategory, includeForecasting }
- **Returns**: Budget variance analysis
- **Key Features**:
  - Budget vs actual for all line items
  - Variance analysis (favorable/unfavorable)
  - Variance percentage calculations
  - Category-wise budget performance
  - Budget forecast to year-end
  - Variance explanations and comments
- **Example**:
  ```javascript
  const budget = await ManagementReportService.generateBudgetVarianceReport({
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    byCategory: true,
    includeForecasting: true
  });
  // Returns: budget vs actual with variance analysis
  ```

---

### 3. ReportGeneratorService
**Purpose**: Generate and distribute reports in multiple formats and mediums

**File**: `ReportGeneratorService.js`
**Methods**: 9

#### Core Methods

##### `exportToExcel(reportData, options)`
- **Purpose**: Export report data to Excel format
- **Parameters**:
  - `reportData`: Report content object
  - `options`: { fileName, sheetName, headers, formatHeader, includeCharts }
- **Returns**: Excel file reference/blob
- **Features**:
  - Professional formatting and styles
  - Multiple worksheets support
  - Charts and pivot tables
  - Conditional formatting
  - Page setup and print options
- **Example**:
  ```javascript
  const excel = await ReportGeneratorService.exportToExcel(reportData, {
    fileName: 'MonthlyReport-Dec2024',
    sheetName: 'Financial Report',
    formatHeader: true,
    includeCharts: true
  });
  // Returns: Excel file ready for download
  ```

##### `exportToPDF(reportData, options)`
- **Purpose**: Export report data to PDF format
- **Parameters**:
  - `reportData`: Report content object
  - `options`: { fileName, pageSize, orientation, includeWatermark, companyLogo }
- **Returns**: PDF file reference/blob
- **Features**:
  - Professional PDF layout
  - Headers and footers
  - Company watermark
  - Page numbering
  - Table of contents
  - Landscape/portrait orientation
- **Example**:
  ```javascript
  const pdf = await ReportGeneratorService.exportToPDF(reportData, {
    fileName: 'AnnualStatement',
    pageSize: 'A4',
    orientation: 'landscape',
    includeWatermark: true
  });
  // Returns: PDF file ready for download
  ```

##### `exportToCSV(reportData, options)`
- **Purpose**: Export report data to CSV format
- **Parameters**:
  - `reportData`: Report content object
  - `options`: { fileName, delimiter, includeHeaders, encoding }
- **Returns**: CSV file reference/blob
- **Features**:
  - Configurable delimiters (comma, semicolon, tab)
  - Header row option
  - Unicode support
  - Proper escaping of special characters
- **Example**:
  ```javascript
  const csv = await ReportGeneratorService.exportToCSV(reportData, {
    fileName: 'SalesData',
    delimiter: ',',
    includeHeaders: true
  });
  // Returns: CSV file ready for download
  ```

##### `generateInMultipleFormats(reportData, formats, baseName)`
- **Purpose**: Generate report in multiple formats simultaneously
- **Parameters**:
  - `reportData`: Report content object
  - `formats`: Array of formats (Excel, PDF, CSV - max 3)
  - `baseName`: Base name for files
- **Returns**: Object with file references for each format
- **Features**:
  - Batch export to up to 3 formats
  - Consistent naming convention
  - All files generated in one operation
- **Example**:
  ```javascript
  const files = await ReportGeneratorService.generateInMultipleFormats(
    reportData,
    ['Excel', 'PDF', 'CSV'],
    'Q4Report'
  );
  // Returns: { excel, pdf, csv } file references
  ```

##### `emailReport(reportData, recipients, emailOptions)`
- **Purpose**: Email report to recipients
- **Parameters**:
  - `reportData`: Report content object
  - `recipients`: Array of email addresses
  - `emailOptions`: { subject, body, format, attachmentName, sendCopy }
- **Returns**: Email delivery status
- **Features**:
  - Direct email distribution
  - Customizable subject and body
  - Report as inline or attachment
  - Send copy to user
  - Delivery tracking
  - Automatic retry on failure
- **Example**:
  ```javascript
  const email = await ReportGeneratorService.emailReport(reportData, 
    ['finance@company.com', 'accounts@company.com'],
    {
      subject: 'Monthly Financial Report - December 2024',
      body: 'Please find attached the monthly financial report.',
      format: 'PDF',
      sendCopy: true
    }
  );
  // Returns: delivery status with confirmation
  ```

##### `scheduleReport(scheduleData)`
- **Purpose**: Schedule recurring report generation and distribution
- **Parameters**:
  - `scheduleData`: { reportType, frequency, triggerTime, recipients, format, jobName }
  - `frequency`: Daily, Weekly, Monthly, Quarterly, Annual
  - `triggerTime`: Time in HH:MM format
- **Returns**: Schedule configuration with nextExecutionTime
- **Features**:
  - Multiple frequency options
  - Automatic generation and distribution
  - Recipient management
  - Format selection
  - Retry on failure
- **Example**:
  ```javascript
  const schedule = await ReportGeneratorService.scheduleReport({
    reportType: 'SalesAnalysis',
    frequency: 'Weekly',
    triggerTime: '06:00',
    recipients: ['sales@company.com'],
    format: 'Excel',
    jobName: 'Weekly Sales Report'
  });
  // Returns: schedule with next execution time
  ```

##### `getScheduledReports(filters)`
- **Purpose**: Retrieve list of scheduled reports
- **Parameters**:
  - `filters`: { status, reportType, frequency, limit }
- **Returns**: Array of scheduled report configurations
- **Example**:
  ```javascript
  const schedules = await ReportGeneratorService.getScheduledReports({
    status: 'Active',
    limit: 20
  });
  // Returns: list of scheduled reports
  ```

##### `deleteScheduledReport(scheduleId)`
- **Purpose**: Cancel a scheduled report
- **Parameters**:
  - `scheduleId`: ID of schedule to delete
- **Returns**: Deletion confirmation
- **Example**:
  ```javascript
  const result = await ReportGeneratorService.deleteScheduledReport('SCHED_001');
  // Returns: confirmation that schedule is deleted
  ```

##### `getReportGenerationHistory(filters)`
- **Purpose**: Retrieve history of generated reports
- **Parameters**:
  - `filters`: { limit, fromDate, toDate, reportType, status }
- **Returns**: Array of past report generation records
- **Features**:
  - Execution timestamp
  - Status (success/failed)
  - Format and file size
  - Recipient count
- **Example**:
  ```javascript
  const history = await ReportGeneratorService.getReportGenerationHistory({
    fromDate: '2024-01-01',
    toDate: '2024-12-31',
    limit: 50
  });
  // Returns: generation history with details
  ```

---

### 4. ReportSchedulerService
**Purpose**: Manage automated report job scheduling and execution

**File**: `ReportSchedulerService.js`
**Methods**: 11

#### Core Methods

##### `createReportJob(jobData)`
- **Purpose**: Create new scheduled report job
- **Parameters**:
  - `jobData`: { jobName, reportType, frequency, triggerTime, recipients }
  - `frequency`: Daily, Weekly, Monthly, Quarterly, Annual
  - `triggerTime`: Time in HH:MM (24-hour format)
- **Returns**: Created job configuration with jobId
- **Validation**:
  - Valid frequency and time format required
  - At least trigger time and report type
- **Example**:
  ```javascript
  const job = await ReportSchedulerService.createReportJob({
    jobName: 'Daily Sales Report',
    reportType: 'Sales Analysis',
    frequency: 'Daily',
    triggerTime: '06:00',
    recipients: ['sales@company.com']
  });
  // Returns: job with ID and next execution time
  ```

##### `getAllReportJobs(filters)`
- **Purpose**: Retrieve all scheduled report jobs
- **Parameters**:
  - `filters`: { status, reportType, frequency }
- **Returns**: Array of job configurations
- **Example**:
  ```javascript
  const jobs = await ReportSchedulerService.getAllReportJobs({
    status: 'Active'
  });
  // Returns: active scheduled report jobs
  ```

##### `getJobExecutionHistory(jobId, filters)`
- **Purpose**: Retrieve execution history for a specific job
- **Parameters**:
  - `jobId`: Job ID
  - `filters`: { limit, fromDate, toDate }
- **Returns**: Array of past executions with status and details
- **Example**:
  ```javascript
  const history = await ReportSchedulerService.getJobExecutionHistory('JOB_001', {
    limit: 30
  });
  // Returns: execution history with duration and status
  ```

##### `executeJobNow(jobId)`
- **Purpose**: Execute scheduled report job immediately
- **Parameters**:
  - `jobId`: Job ID to execute
- **Returns**: Execution status and result
- **Features**:
  - Immediate trigger without waiting for scheduled time
  - Returns execution tracking ID
  - Async execution with status polling
- **Example**:
  ```javascript
  const execution = await ReportSchedulerService.executeJobNow('JOB_001');
  // Returns: execution ID and current status
  ```

##### `updateReportJob(jobId, updateData)`
- **Purpose**: Update job configuration
- **Parameters**:
  - `jobId`: Job ID
  - `updateData`: { frequency, triggerTime, recipients, status, etc }
- **Returns**: Updated job configuration
- **Example**:
  ```javascript
  const updated = await ReportSchedulerService.updateReportJob('JOB_001', {
    frequency: 'Weekly',
    triggerTime: '09:00'
  });
  // Returns: updated configuration
  ```

##### `pauseReportJob(jobId)`
- **Purpose**: Pause a scheduled report job
- **Parameters**:
  - `jobId`: Job ID to pause
- **Returns**: Paused job status
- **Example**:
  ```javascript
  const paused = await ReportSchedulerService.pauseReportJob('JOB_001');
  // Returns: pause confirmation
  ```

##### `resumeReportJob(jobId)`
- **Purpose**: Resume a paused report job
- **Parameters**:
  - `jobId`: Job ID to resume
- **Returns**: Resumed job status
- **Example**:
  ```javascript
  const resumed = await ReportSchedulerService.resumeReportJob('JOB_001');
  // Returns: resume confirmation
  ```

##### `deleteReportJob(jobId)`
- **Purpose**: Delete a scheduled report job
- **Parameters**:
  - `jobId`: Job ID to delete
- **Returns**: Deletion confirmation
- **Example**:
  ```javascript
  const deleted = await ReportSchedulerService.deleteReportJob('JOB_001');
  // Returns: deletion confirmation
  ```

##### `getJobExecutionStatistics(jobId)`
- **Purpose**: Get aggregated statistics for job executions
- **Parameters**:
  - `jobId`: Job ID
- **Returns**: Statistics object with success rate, average duration, etc
- **Metrics**:
  - Total executions, Successful, Failed
  - Success rate percentage
  - Average execution time
  - Total emails sent
  - Uptime percentage
- **Example**:
  ```javascript
  const stats = await ReportSchedulerService.getJobExecutionStatistics('JOB_001');
  // Returns: success rate 93.3%, avg time 2.4s, 28 of 30 successful
  ```

##### `configureJobRetry(jobId, retryConfig)`
- **Purpose**: Configure retry behavior for failed job executions
- **Parameters**:
  - `jobId`: Job ID
  - `retryConfig`: { enabled, attempts, delaySeconds }
  - `attempts`: 1-5 (max retries on failure)
  - `delaySeconds`: Delay between retry attempts
- **Returns**: Updated retry configuration
- **Example**:
  ```javascript
  const retry = await ReportSchedulerService.configureJobRetry('JOB_001', {
    enabled: true,
    attempts: 3,
    delaySeconds: 60
  });
  // Returns: retry configuration
  ```

##### `calculateNextExecutionTime(frequency, triggerTime)`
- **Purpose**: Helper method to calculate next execution time
- **Parameters**:
  - `frequency`: Frequency type
  - `triggerTime`: Trigger time in HH:MM
- **Returns**: Date object with next execution time
- **Logic**:
  - If trigger time has passed, moves to next occurrence
  - Respects frequency (daily, weekly, monthly, etc)
- **Used Internally**: By job creation and update methods

---

## Complete Usage Example

### Scenario: Generating Multi-Format Monthly Financial Report with Scheduling

```javascript
import {
  FinancialReportService,
  ManagementReportService,
  ReportGeneratorService,
  ReportSchedulerService
} from './services/index.js';

// 1. Generate financial statements
const incomeStatement = await FinancialReportService.generateIncomeStatement({
  fromDate: '2024-12-01',
  toDate: '2024-12-31',
  includeRatios: true
});

const balanceSheet = await FinancialReportService.generateBalanceSheet({
  asOfDate: '2024-12-31',
  includeValidation: true
});

// 2. Add management insights
const kpis = await ManagementReportService.generateKPIDashboard({
  fromDate: '2024-12-01',
  toDate: '2024-12-31',
  compareTarget: true
});

// 3. Combined report data
const reportData = {
  incomeStatement,
  balanceSheet,
  kpis,
  generatedDate: new Date(),
  reportPeriod: 'Dec 2024'
};

// 4. Export to multiple formats
const files = await ReportGeneratorService.generateInMultipleFormats(
  reportData,
  ['Excel', 'PDF', 'CSV'],
  'FinancialReport_Dec2024'
);

// 5. Email to stakeholders
await ReportGeneratorService.emailReport(reportData, 
  ['finance@company.com', 'cfo@company.com'],
  {
    subject: 'Monthly Financial Report - December 2024',
    format: 'PDF',
    sendCopy: true
  }
);

// 6. Schedule recurring monthly report
const schedule = await ReportSchedulerService.createReportJob({
  jobName: 'Monthly Financial Report',
  reportType: 'Income Statement',
  frequency: 'Monthly',
  triggerTime: '08:00',
  recipients: ['finance@company.com']
});
```

---

## Integration Points

### With Other Modules

**Accounting Module**:
- Fetches GL account balances and journal entries
- Uses ChartOfAccountsService for account hierarchies
- References financial year from MastersService

**Inventory Module**:
- Stock status and valuation data
- Turnover calculations based on movements
- Cost of goods sold calculations

**Sales Module**:
- Sales data and customer information
- Order and invoice details for analysis
- Return information for adjustments

**Purchasing Module**:
- Purchase data and vendor information
- PO and GRN details for analysis

**Customers Module**:
- Customer credit information
- Customer classification and segmentation
- Lifetime value calculations

---

## Configuration

### Report Format Configuration

**Excel**: Headers, Charts, Conditional Formatting, Multiple Sheets
**PDF**: Page Size (A4, Letter), Orientation (Portrait/Landscape), Watermark
**CSV**: Delimiter (Comma, Semicolon, Tab), Encoding (UTF-8, ISO-8859-1)

### Schedule Configuration

**Frequencies**:
- Daily: Executes every day at specified time
- Weekly: Executes every 7 days
- Monthly: Executes on same date each month
- Quarterly: Executes every 3 months
- Annual: Executes once yearly

**Retry Configuration**:
- Enabled: true/false
- Attempts: 1-5 (number of retries after failure)
- Delay: Seconds to wait between retry attempts

---

## Error Handling

All services implement standardized error handling:

```javascript
try {
  const report = await FinancialReportService.generateIncomeStatement({...});
} catch (error) {
  // Error messages logged with context
  // Status codes: 400 (bad request), 404 (not found), 500 (server error)
  // All errors include descriptive messages and logging
}
```

---

## Performance Considerations

- Report generation is computationally intensive (cache results)
- Scheduled reports run asynchronously (background jobs)
- Large reports (Excel/PDF) may take 5-30 seconds
- Multi-format export processes sequentially
- Email delivery is async with retry mechanisms

---

## Security Notes

- Reports contain sensitive financial data
- Access control required before generation
- Email distribution should verify recipients
- Export files should be cleaned up after download
- Audit logging tracks all report generation
- Scheduled jobs stored securely with encryption

---

## Next Steps

1. **Implement Controllers**: Create REST endpoints for each service method
2. **Add Validators**: Validate request parameters before service calls
3. **Create Middleware**: Authentication and authorization checks
4. **Setup Routes**: Define API endpoints for reporting functionality
5. **Add Testing**: Write unit and integration tests for all services
6. **Schedule Job Processing**: Implement background job queue (Bull/RabbitMQ)
7. **Email Integration**: Configure SMTP for report distribution
8. **File Storage**: Setup cloud storage (S3/GCS) for generated reports
