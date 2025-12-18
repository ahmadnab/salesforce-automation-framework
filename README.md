# Salesforce Automation Framework

Playwright-based automation framework for Salesforce Lightning Experience testing.

## Prerequisites

- Node.js v18+
- Salesforce CLI (`sf`) v2+
- Access to a Salesforce org

## Quick Start

```bash
# Install dependencies
npm install
npx playwright install chromium

# Authenticate with Salesforce
sf org login web --alias myOrg

# Deploy Salesforce configuration
./scripts/deploy-config.sh myOrg

# Run tests
npm test
```

## Project Structure

```
salesforce-automation-framework/
├── config/environment.ts      # Configuration
├── force-app/main/default/    # Salesforce metadata
│   ├── objects/               # Custom fields
│   └── permissionsets/        # Permission sets
├── tests/
│   ├── fixtures/              # Playwright fixtures  
│   ├── pages/                 # Page Object Model
│   ├── utils/                 # SF utilities
│   └── *.spec.ts              # Test specs
└── scripts/deploy-config.sh   # Deployment script
```

## Authentication

Uses SF CLI for authentication (MFA bypass via frontdoor.jsp):

```bash
sf org login web --alias myOrg
```

The framework uses `sf org display` to get the access token, then `frontdoor.jsp` to establish browser session.

## Test Scenarios

### Scenario 1: Opportunity Creation and Validation
1. Create Account "A1" if not exists
2. Create Opportunity with custom `Quantity__c` field
3. Populate all available fields
4. Validate Opportunity details on record page
5. Validate Opportunity appears in Account related list

### Scenario 2: Read-Only Platform User Access
1. Create Standard Platform User
2. Assign `OpportunityReadOnly` permission set (read-only access)
3. Log in as the Platform User
4. Validate user can view Opportunity
5. Validate user cannot edit Opportunity

## Running Tests

```bash
npm test                        # All tests
npx playwright test scenario-1  # Specific scenario
npx playwright test --headed    # With browser visible
npx playwright test --ui        # Debug mode
npx playwright show-report      # View HTML report
```

## Framework Design Decisions

### Page Object Model
Each Salesforce object has a dedicated page class (`AccountPage`, `OpportunityPage`, `UserPage`) extending `BasePage`. This provides:
- Separation of test logic from UI interaction
- Reusable methods for common operations
- Easy maintenance when Salesforce UI changes

### SF CLI Authentication
Chose SF CLI over SOAP/REST authentication because:
- No password/security token management needed
- Works with MFA-enabled orgs
- Leverages existing Salesforce developer tooling
- Single `sf org login web` command handles OAuth flow

### Salesforce-Specific Utilities
`SalesforceUtils` handles Lightning UI challenges:
- Multiple spinner types detection
- Toast message capture and validation
- Dynamic field filling (text, combobox, lookup, date)
- Network idle + component render waiting

## Salesforce Configuration Persistence

All configuration is stored as Salesforce metadata in `force-app/main/default/`:

| Configuration | File |
|--------------|------|
| Quantity__c field | `objects/Opportunity/fields/Quantity__c.field-meta.xml` |
| OpportunityReadOnly permission set | `permissionsets/OpportunityReadOnly.permissionset-meta.xml` |

**Automatic deployment**: Run `./scripts/deploy-config.sh <org-alias>` to deploy all configuration to a new scratch org. No manual steps required.

## Handling Salesforce Automation Challenges

| Challenge | Solution |
|-----------|----------|
| Lightning spinners | Multiple selector detection with timeout |
| Toast messages | Auto-capture, type validation, dismiss handling |
| Dynamic fields | Flexible selectors for Lightning components |
| Async page behavior | Combined network idle + element visibility waits |
| MFA authentication | SF CLI token + frontdoor.jsp bypass |
| Loading states | Custom `waitForPageLoad()` combining multiple strategies |

## Known Limitations

1. **Test Timeouts**: Salesforce Lightning can be slow; tests may need increased timeouts
2. **Record Types**: Tests assume default record types
3. **Namespace**: For managed packages, field API names need adjustment
4. **Parallel Execution**: Tests run sequentially to maintain data dependencies
5. **Login As**: Requires admin permissions and may not work in all orgs

## Future Improvements

With more time, the following enhancements could be made:

1. **Authentication**
   - OAuth 2.0 JWT Bearer flow for CI/CD
   - Token caching to reduce login overhead

2. **Test Data Management**
   - Factory pattern for test data generation
   - Automatic cleanup with teardown hooks
   - Data builder classes for complex records

3. **CI/CD Integration**
   - GitHub Actions workflow
   - Scratch org pooling
   - Parallel execution across org pools

4. **Framework Enhancements**
   - Custom reporters for Salesforce context
   - Screenshot comparison for UI validation
   - Performance metrics collection

## Troubleshooting

```bash
# Re-authenticate
sf org login web --alias myOrg

# Check org connection
sf org display

# Verify metadata deployment
sf project deploy start --dry-run --source-dir force-app/main/default
```

## Environment Variables (Optional)

```bash
SF_INSTANCE_URL=https://your-org.my.salesforce.com
SF_API_VERSION=60.0
```
