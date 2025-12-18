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

Uses SF CLI for authentication (no password/security token needed):

```bash
# Login to org (opens browser)
sf org login web --alias myOrg

# For scratch orgs / sandboxes:
sf org login web --alias myOrg --instance-url https://test.salesforce.com
```

The framework uses `sf org display` to get the access token, then `frontdoor.jsp` to establish browser session.

## Test Scenarios

### Scenario 1: Opportunity Creation
1. Create Account "A1" if not exists
2. Create Opportunity with custom `Quantity__c` field
3. Validate Opportunity details on record page
4. Validate Opportunity appears in Account related list

### Scenario 2: Read-Only User Access
1. Create Standard Platform User
2. Assign `OpportunityReadOnly` permission set
3. Validate user can view Opportunities
4. Validate user cannot edit Opportunities

## Running Tests

```bash
npm test                                    # All tests
npx playwright test scenario-1             # Specific scenario
npx playwright test --headed               # With browser visible
npx playwright test --ui                   # Debug mode
npx playwright show-report                 # View HTML report
```

## Salesforce Configuration

Deploys via `scripts/deploy-config.sh`:
- `Quantity__c` - Number field on Opportunity
- `OpportunityReadOnly` - Permission set for read-only access

## Framework Features

- **Page Object Model**: `BasePage`, `AccountPage`, `OpportunityPage`, `UserPage`
- **Lightning Utilities**: Spinner handling, toast capture, dynamic fields
- **API Utilities**: SOQL queries, record CRUD, user management
- **MFA Bypass**: Uses SF CLI token + frontdoor.jsp

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
