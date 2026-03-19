import { FieldValidator, RequestValidator, rules } from './validationUtils.js';

/**
 * Accounting Module Validators
 */

/**
 * Create Chart of Accounts Validator
 */
export const createChartOfAccountsValidator = () => {
  const schema = {
    accountCode: new FieldValidator('accountCode')
      .add('required', rules.required, 'Account code is required')
      .add('minLength', rules.minLength(3), 'Account code must be at least 3 characters'),

    accountName: new FieldValidator('accountName')
      .add('required', rules.required, 'Account name is required')
      .add('minLength', rules.minLength(3), 'Account name must be at least 3 characters')
      .add('maxLength', rules.maxLength(100), 'Account name cannot exceed 100 characters'),

    accountType: new FieldValidator('accountType')
      .add('required', rules.required, 'Account type is required')
      .add('enum', rules.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']), 
        'Account type must be Asset, Liability, Equity, Revenue, or Expense'),

    accountGroup: new FieldValidator('accountGroup')
      .add('required', rules.required, 'Account group is required'),

    openingBalance: new FieldValidator('openingBalance')
      .add('optional', rules.optional, '')
      .add('number', rules.number, 'Opening balance must be a number'),

    description: new FieldValidator('description')
      .add('optional', rules.optional, '')
      .add('maxLength', rules.maxLength(500), 'Description cannot exceed 500 characters'),
  };

  return new RequestValidator(schema);
};

/**
 * Create Journal Entry Validator
 */
export const createJournalEntryValidator = () => {
  const schema = {
    entryDate: new FieldValidator('entryDate')
      .add('required', rules.required, 'Entry date is required')
      .add('date', rules.date, 'Entry date must be a valid date'),

    description: new FieldValidator('description')
      .add('required', rules.required, 'Description is required')
      .add('minLength', rules.minLength(5), 'Description must be at least 5 characters'),

    reference: new FieldValidator('reference')
      .add('optional', rules.optional, '')
      .add('minLength', rules.minLength(3), 'Reference must be at least 3 characters'),

    items: new FieldValidator('items')
      .add('required', rules.nonEmptyArray, 'Journal entry must have at least two items')
      .add('array', rules.array, 'Items must be an array'),

    notes: new FieldValidator('notes')
      .add('optional', rules.optional, '')
      .add('maxLength', rules.maxLength(500), 'Notes cannot exceed 500 characters'),
  };

  return new RequestValidator(schema);
};

/**
 * Create Account Group Validator
 */
export const createAccountGroupValidator = () => {
  const schema = {
    groupName: new FieldValidator('groupName')
      .add('required', rules.required, 'Group name is required')
      .add('minLength', rules.minLength(3), 'Group name must be at least 3 characters')
      .add('maxLength', rules.maxLength(50), 'Group name cannot exceed 50 characters'),

    groupType: new FieldValidator('groupType')
      .add('required', rules.required, 'Group type is required')
      .add('enum', rules.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']), 
        'Group type must be valid'),

    parentGroup: new FieldValidator('parentGroup')
      .add('optional', rules.optional, ''),

    description: new FieldValidator('description')
      .add('optional', rules.optional, '')
      .add('maxLength', rules.maxLength(500), 'Description cannot exceed 500 characters'),
  };

  return new RequestValidator(schema);
};

/**
 * Create Contra Validator
 */
export const createContraValidator = () => {
  const schema = {
    contraDate: new FieldValidator('contraDate')
      .add('required', rules.required, 'Contra date is required')
      .add('date', rules.date, 'Contra date must be a valid date'),

    fromAccount: new FieldValidator('fromAccount')
      .add('required', rules.required, 'From account is required'),

    toAccount: new FieldValidator('toAccount')
      .add('required', rules.required, 'To account is required'),

    amount: new FieldValidator('amount')
      .add('required', rules.required, 'Amount is required')
      .add('positiveNumber', rules.positiveNumber, 'Amount must be positive'),

    contraNumber: new FieldValidator('contraNumber')
      .add('optional', rules.optional, '')
      .add('minLength', rules.minLength(3), 'Contra number must be at least 3 characters'),

    notes: new FieldValidator('notes')
      .add('optional', rules.optional, '')
      .add('maxLength', rules.maxLength(500), 'Notes cannot exceed 500 characters'),
  };

  return new RequestValidator(schema);
};

export default {
  createChartOfAccountsValidator,
  createJournalEntryValidator,
  createAccountGroupValidator,
  createContraValidator,
};
