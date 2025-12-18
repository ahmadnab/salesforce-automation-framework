import { test, expect, testData } from './fixtures';
import { AccountPage } from './pages/account-page';

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
    // Shared test data - using fixed names for predictability
    const accountName = 'A1';
    const opportunityName = `TestOpp_${Date.now()}`;

    test('1.1 - Create Account A1 if not exists', async ({ accountPage }) => {
        // Login via frontdoor
        await accountPage.login();

        // Create account if it doesn't exist
        const accountId = await accountPage.createAccountIfNotExists(accountName);
        expect(accountId).toBeTruthy();

        console.log(`Account A1 ready (ID: ${accountId})`);
    });

    test('1.2 - Create new Opportunity with all fields including Quantity', async ({
        opportunityPage
    }) => {
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
        const opportunityId = await opportunityPage.sfUtils.getCurrentRecordId();
        expect(opportunityId).toBeTruthy();

        console.log(`Created Opportunity: ${opportunityName} (ID: ${opportunityId})`);
    });

    test('1.3 - Validate Opportunity details on Detail page', async ({
        opportunityPage
    }) => {
        // Login
        await opportunityPage.login();

        // Navigate to the created Opportunity
        await opportunityPage.navigateToOpportunityByName(opportunityName);

        // Validate the field values
        const details = await opportunityPage.getOpportunityDetails();

        // Verify required fields
        expect(details['Opportunity Name'] || '').toContain(opportunityName);
        expect(details['Stage'] || '').toContain('Prospecting');

        console.log('Opportunity details validated successfully');
    });

    test('1.4 - Validate Opportunity appears in Account related list', async ({
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
});
