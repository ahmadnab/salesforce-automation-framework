# Salesforce Automation Framework

A Playwright-based automation framework for Salesforce Lightning Experience testing.

## Overview

This framework provides automated UI testing capabilities for Salesforce Lightning, with specific focus on:
- Account and Opportunity management
- User permission validation
- Custom field testing

## Prerequisites

- **Node.js** v18 or higher
- **npm** v8 or higher
- **Salesforce CLI (sf)** v2.x or higher
- Access to a Salesforce scratch org or sandbox

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd salesforce-automation-framework

# Install Node.js dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### 2. Configure Salesforce Org

```bash
# Authenticate with Salesforce (opens browser for OAuth)
sf org login web --alias myOrg --instance-url https://login.salesforce.com

# For scratch orgs or sandboxes:
sf org login web --alias myOrg --instance-url https://test.salesforce.com
```

### 3. Deploy Salesforce Configuration

```bash
# Run the deployment script
chmod +x scripts/deploy-config.sh
./scripts/deploy-config.sh myOrg
```

This deploys:
- `Quantity__c` custom field on Opportunity
- `OpportunityReadOnly` permission set

### 4. Set Environment Variables (Optional)

Create a `.env` file or set environment variables:

```bash
export SF_INSTANCE_URL="https://your-org.my.salesforce.com"
export SF_USERNAME="your.username@example.com"
export SF_PASSWORD="YourPassword"
export SF_API_VERSION="60.0"
```

If not set, defaults in `config/environment.ts` are used.

## Running Tests

```bash
# Run all tests
npm test

# Run specific scenario
npx playwright test scenario-1-opportunity.spec.ts
npx playwright test scenario-2-readonly-user.spec.ts

# Run with UI mode (debugging)
npx playwright test --ui

# Run with headed browser
npx playwright test --headed

# Generate HTML report
npx playwright show-report
```

## Framework Architecture

```
salesforce-automation-framework/
├── config/
│   └── environment.ts        # Environment configuration
├── force-app/
│   └── main/default/
│       ├── objects/          # Custom field metadata
│       └── permissionsets/   # Permission set metadata
├── tests/
│   ├── fixtures/             # Playwright fixtures
│   ├── pages/                # Page Object Model classes
│   ├── utils/                # Salesforce utilities
│   └── *.spec.ts            # Test specifications
├── scripts/
│   └── deploy-config.sh     # Configuration deployment script
└── playwright.config.ts     # Playwright configuration
```

### Page Object Model

The framework uses the Page Object Model pattern:

- **BasePage**: Common Salesforce navigation and login
- **AccountPage**: Account object operations
- **OpportunityPage**: Opportunity CRUD with custom fields
- **UserPage**: User management and permissions

### Salesforce Utilities

- **SalesforceUtils**: Handles Lightning-specific challenges
  - Spinner/loading state management
  - Toast message capture
  - Dynamic field filling
  - Combobox and lookup handling

- **SalesforceApiUtils**: REST API operations
  - SOAP authentication (MFA bypass)
  - Frontdoor.jsp session management
  - SOQL queries
  - Record CRUD operations

## Test Scenarios

### Scenario 1: Opportunity Creation and Validation

1. Creates Account "A1" if not exists
2. Creates Opportunity with all fields including custom `Quantity` field
3. Validates field values on Opportunity detail page
4. Validates Opportunity appears in Account's related list

### Scenario 2: Read-Only Platform User Access

1. Creates Standard Platform User
2. Assigns read-only Opportunity access
3. Validates user can view Opportunities
4. Validates user cannot edit Opportunities

## Salesforce-Specific Challenges Handled

### 1. Lightning UI Behavior
- Extended timeouts for component loading
- Multiple spinner type detection
- Dynamic content waiting strategies

### 2. Dynamic DOM Elements
- Flexible selectors for Lightning components
- Shadow DOM traversal where needed
- Component-aware element location

### 3. Asynchronous Page Behavior
- Network idle detection
- Component render waiting
- Aura framework event handling

### 4. Toast Messages
- Auto-capture and validation
- Type verification (success/error/warning)
- Auto-dismiss handling

### 5. Authentication
- SOAP API authentication (bypasses MFA)
- Frontdoor.jsp session establishment
- Login-As functionality for user testing

## Configuration Persistence

All Salesforce configuration is stored as metadata in `force-app/`:

```
force-app/main/default/
├── objects/
│   └── Opportunity/
│       └── fields/
│           └── Quantity__c.field-meta.xml
└── permissionsets/
    └── OpportunityReadOnly.permissionset-meta.xml
```

When a new scratch org is created, run:
```bash
./scripts/deploy-config.sh <org-alias>
```

## Known Limitations

1. **MFA Required Orgs**: The frontdoor.jsp approach may not work if SOAP API access is restricted
2. **Record Type Dependencies**: Tests assume default record types; additional configuration needed for custom types
3. **Namespace Prefix**: For managed packages, field API names need adjustment
4. **Parallel Execution**: Tests run sequentially to maintain data dependencies

## Future Improvements

With more time, the following enhancements could be made:

1. **Authentication**
   - OAuth 2.0 JWT Bearer flow for service-to-service auth
   - Token caching to reduce login overhead

2. **Test Data Management**
   - Factory pattern for test data generation
   - Automatic cleanup with test teardown hooks
   - Data builder classes for complex records

3. **Framework Enhancements**
   - Custom reporters for Salesforce context
   - Screenshot comparison for UI validation
   - Performance metrics collection

4. **CI/CD Integration**
   - GitHub Actions workflow
   - Scratch org pooling
   - Parallel test execution across org pools

5. **Additional Scenarios**
   - Approval process testing
   - Flow automation validation
   - Bulk data operations

## Troubleshooting

### Common Issues

**Login Failures**
```bash
# Re-authenticate the org
sf org login web --alias myOrg
```

**Deployment Failures**
```bash
# Check org connection
sf org display --target-org myOrg

# Verify metadata format
sf project deploy start --dry-run --source-dir force-app/main/default
```

**Test Timeouts**
- Increase timeouts in `playwright.config.ts`
- Check network connectivity to Salesforce
- Verify org is responsive

## Contributing

1. Create feature branch
2. Make changes with proper tests
3. Ensure all tests pass
4. Submit pull request

## License

MIT License - See LICENSE file for details
