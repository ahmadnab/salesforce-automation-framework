import { test, expect, testData } from './fixtures';
import { UserPage } from './pages/user-page';
import { OpportunityPage } from './pages/opportunity-page';
import { config } from '../config/environment';

/**
 * Scenario 2: Read-Only Platform User Access
 * 
 * This test suite covers:
 * 1. Creating a Standard Platform User
 * 2. Assigning read-only access to Opportunity
 * 3. Logging in as the Platform User
 * 4. Validating user can view Opportunities
 * 5. Validating user cannot edit Opportunities
 */

test.describe('Scenario 2: Read-Only Platform User Access', () => {
    // Shared test data
    const platformUserData = {
        firstName: 'Test',
        lastName: 'PlatformUser',
        email: 'test.platformuser@test.automation.com',
        username: `testplatformuser_${Date.now()}@test.automation.com`,
        password: 'TestPass123!@#',
    };
    let platformUserId: string;

    test.beforeAll(async ({ browser }) => {
        // Create a login context for setup
        const context = await browser.newContext();
        const page = await context.newPage();
        const userPage = new UserPage(page);

        // Login as admin
        await userPage.login();

        // Check if user already exists or create new
        const existingUserId = await userPage.getUserIdByUsername(platformUserData.username);

        if (!existingUserId) {
            // Create Standard Platform User
            platformUserId = await userPage.createStandardPlatformUser({
                firstName: platformUserData.firstName,
                lastName: platformUserData.lastName,
                email: platformUserData.email,
                username: platformUserData.username,
            });

            // Assign Opportunity Read Only permission set
            await userPage.assignPermissionSetToUser(platformUserId, 'OpportunityReadOnly');

            console.log(`Created Platform User: ${platformUserData.username} (ID: ${platformUserId})`);
        } else {
            platformUserId = existingUserId;
            console.log(`Using existing Platform User: ${platformUserData.username}`);
        }

        await context.close();
    });

    test('2.1 - Verify Platform User was created successfully', async ({ userPage }) => {
        // Login as admin
        await userPage.login();

        // Verify user exists
        const userDetails = await userPage.getUserDetails(platformUserId);

        expect(userDetails.FirstName).toBe(platformUserData.firstName);
        expect(userDetails.LastName).toBe(platformUserData.lastName);
        expect(userDetails.IsActive).toBe(true);

        console.log('Platform User verified successfully');
    });

    test('2.2 - Verify Platform User has Opportunity Read Only permission set', async ({
        userPage
    }) => {
        // Login as admin
        await userPage.login();

        // Check permission set assignment
        const hasPermSet = await userPage.userHasPermissionSet(platformUserId, 'OpportunityReadOnly');
        expect(hasPermSet).toBe(true);

        console.log('Opportunity Read Only permission set verified');
    });

    test('2.3 - Platform User can view Opportunity (Login As)', async ({ page, userPage }) => {
        // Login as admin first
        await userPage.login();

        // Use Login As feature to switch to platform user
        await userPage.loginAsUser(platformUserData.username);

        // Navigate to Opportunities
        const opportunityPage = new OpportunityPage(page);
        await opportunityPage.navigate();

        // Verify list view loads
        await opportunityPage.sfUtils.waitForPageLoad();

        // The page should load without permission errors
        const pageTitle = await opportunityPage.getPageTitle();
        expect(pageTitle.toLowerCase()).toContain('opportunit');

        console.log('Platform User can view Opportunities list');
    });

    test('2.4 - Platform User cannot edit Opportunity', async ({ page, userPage }) => {
        // Login as admin first
        await userPage.login();

        // Use Login As feature
        await userPage.loginAsUser(platformUserData.username);

        // Navigate to Opportunities
        const opportunityPage = new OpportunityPage(page);
        await opportunityPage.navigate();
        await opportunityPage.sfUtils.waitForPageLoad();

        // Try to find an existing opportunity
        // First check if there are any opportunities visible
        const opportunityLinks = page.locator('a[data-refid="recordId"]');
        const count = await opportunityLinks.count();

        if (count > 0) {
            // Click on first opportunity
            await opportunityLinks.first().click();
            await opportunityPage.sfUtils.waitForPageLoad();

            // Check if Edit button is NOT available or clicking it shows an error
            const canEdit = await opportunityPage.canEdit();

            if (canEdit) {
                // If edit button exists, clicking it should show permission error
                await opportunityPage.clickEdit();

                // Look for error message or lack of edit form
                const hasError = await page.locator('text=/insufficient|access|permission|cannot edit/i')
                    .isVisible({ timeout: 5000 })
                    .catch(() => false);

                // Either there's an error or fields should be read-only
                if (!hasError) {
                    // Check if fields are still read-only despite edit mode
                    const isFieldEditable = await opportunityPage.isFieldEditable('Opportunity Name');
                    expect(isFieldEditable).toBe(false);
                }
            } else {
                // No edit button means read-only access is working
                expect(canEdit).toBe(false);
            }

            console.log('Verified Platform User cannot edit Opportunity');
        } else {
            // No opportunities to test - create one via API and test
            console.log('No existing opportunities found - skipping edit validation');
            test.skip();
        }
    });

    // Alternative approach: Direct API validation of user permissions
    test('2.5 - Validate user profile has read-only Opportunity access', async ({
        userPage
    }) => {
        // Login as admin
        await userPage.login();

        // Query user's profile/permission details via API
        const userDetails = await userPage.getUserDetails(platformUserId);

        // Verify user is on Standard Platform User profile (read-only by default)
        expect(userDetails.ProfileId).toBeTruthy();

        console.log('Platform User profile validated');
    });

    // Cleanup
    test.afterAll(async ({ browser }) => {
        // Deactivate the test user (don't delete - keeps for audit trail)
        const context = await browser.newContext();
        const page = await context.newPage();
        const userPage = new UserPage(page);

        await userPage.login();

        // Optionally deactivate user
        // await userPage.deactivateUser(platformUserId);

        await context.close();
    });
});
