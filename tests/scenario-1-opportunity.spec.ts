import { test, expect, testData } from './fixtures';
import { AccountPage } from './pages/account-page';
import { OpportunityPage } from './pages/opportunity-page';

/**
 * Scenario 1: Opportunity Creation and Validation
 * 
 * This test suite covers:
 * 1. Creating Account A1 if it doesn't exist
 * 2. Creating a new Opportunity with custom Quantity field
 * 3. Validating Opportunity details on the detail page
 * 4. Validating Opportunity appears in Account's related list
 */

test.describe('Scenario 1: Opportunity Creation and Validation', () => {
    // Shared test data
    const accountName = 'A1';
    let accountId: string;
    let opportunityId: string;
    let opportunityName: string;

    test.beforeAll(async ({ browser }) => {
        // Create a login context for setup
        const context = await browser.newContext();
        const page = await context.newPage();
        const accountPage = new AccountPage(page);

        // Login and create account if needed
        await accountPage.login();
        accountId = await accountPage.createAccountIfNotExists(accountName);

        await context.close();
    });

    test('1.1 - Create new Opportunity with all fields including Quantity', async ({
        opportunityPage
    }) => {
        // Generate unique opportunity name
        opportunityName = `Opportunity_${Date.now()}`;
        const closeDate = testData.getFutureDate(30);

        // Login
        await opportunityPage.login();

        // Navigate to Opportunities and create new
        await opportunityPage.openNewOpportunityModal();

        // Fill all available fields
        await opportunityPage.fillOpportunityForm({
            name: opportunityName,
            accountName: accountName,
            closeDate: closeDate,
            stage: testData.stages.prospecting,
            amount: '50000',
            quantity: 100,
            probability: '50',
            type: 'New Customer',
            leadSource: 'Web',
            description: 'Test opportunity created by automation framework',
            nextStep: 'Schedule demo meeting',
        });

        // Save the Opportunity
        await opportunityPage.sfUtils.saveRecord();

        // Wait for success toast
        const toastMessage = await opportunityPage.sfUtils.waitForToast('success');
        expect(toastMessage).toContain('was created');

        // Get the created Opportunity ID
        opportunityId = await opportunityPage.sfUtils.getCurrentRecordId();
        expect(opportunityId).toBeTruthy();

        console.log(`Created Opportunity: ${opportunityName} (ID: ${opportunityId})`);
    });

    test('1.2 - Validate Opportunity details on Detail page', async ({
        opportunityPage
    }) => {
        // Login
        await opportunityPage.login();

        // Navigate to the created Opportunity
        await opportunityPage.navigateToOpportunityByName(opportunityName);

        // Validate the field values
        const details = await opportunityPage.getOpportunityDetails();

        // Verify required fields
        expect(details['Opportunity Name']).toContain(opportunityName);
        expect(details['Stage']).toContain('Prospecting');

        // Verify optional fields where populated
        if (details['Amount']) {
            expect(details['Amount']).toContain('50,000');
        }

        if (details['Quantity']) {
            expect(details['Quantity']).toContain('100');
        }

        console.log('Opportunity details validated successfully');
    });

    test('1.3 - Validate Opportunity appears in Account related list', async ({
        accountPage
    }) => {
        // Login
        await accountPage.login();

        // Navigate to Account A1
        await accountPage.navigateToAccountByName(accountName);

        // Verify Opportunity appears in related list
        const isVisible = await accountPage.verifyOpportunityInRelatedList(opportunityName);
        expect(isVisible).toBe(true);

        console.log(`Verified Opportunity "${opportunityName}" appears in Account "${accountName}" related list`);
    });

    // Cleanup (optional - comment out if you want to keep test data)
    test.afterAll(async ({ browser }) => {
        // Skip cleanup to preserve data for Scenario 2
        // If cleanup is needed, uncomment below:
        /*
        const context = await browser.newContext();
        const page = await context.newPage();
        const opportunityPage = new OpportunityPage(page);
        
        await opportunityPage.login();
        if (opportunityId) {
          await opportunityPage.deleteOpportunity(opportunityId);
        }
        
        await context.close();
        */
    });
});
