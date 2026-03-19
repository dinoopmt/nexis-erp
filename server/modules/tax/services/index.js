import TaxCalculationService from './TaxCalculationService.js';
import TaxRuleService from './TaxRuleService.js';
import DeductionService from './DeductionService.js';
import TaxComplianceService from './TaxComplianceService.js';

/**
 * Tax Module Services
 * Central export for all tax services
 *
 * Services:
 * - TaxCalculationService: Calculate tax on transactions
 * - TaxRuleService: Manage tax rules and slabs
 * - DeductionService: Manage tax deductions and exemptions
 * - TaxComplianceService: Track compliance and filings
 */

export {
  TaxCalculationService,
  TaxRuleService,
  DeductionService,
  TaxComplianceService,
};
