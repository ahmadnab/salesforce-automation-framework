import { test as base, expect, Page } from '@playwright/test';
import { AccountPage } from '../pages/account-page';
import { OpportunityPage } from '../pages/opportunity-page';
import { UserPage } from '../pages/user-page';
import { SalesforceApiUtils } from '../utils/salesforce-api';
import { SalesforceUtils } from '../utils/salesforce-utils';

/**
 * Extended Playwright test fixtures for Salesforce testing
 * Provides pre-configured page objects and utilities
 */

// Define fixture types
type SalesforceFixtures = {
    accountPage: AccountPage;
    opportunityPage: OpportunityPage;
    userPage: UserPage;
    sfApi: SalesforceApiUtils;
    sfUtils: SalesforceUtils;
    authenticatedPage: Page;
};

// Extend the base test with Salesforce fixtures
export const test = base.extend<SalesforceFixtures>({
    /**
     * Account page object fixture
     */
    accountPage: async ({ page }, use) => {
        const accountPage = new AccountPage(page);
        await use(accountPage);
    },

    /**
     * Opportunity page object fixture
     */
    opportunityPage: async ({ page }, use) => {
        const opportunityPage = new OpportunityPage(page);
        await use(opportunityPage);
    },

    /**
     * User page object fixture
     */
    userPage: async ({ page }, use) => {
        const userPage = new UserPage(page);
        await use(userPage);
    },

    /**
     * Salesforce API utilities fixture
     */
    sfApi: async ({ page }, use) => {
        const sfApi = new SalesforceApiUtils(page);
        await use(sfApi);
    },

    /**
     * Salesforce UI utilities fixture
     */
    sfUtils: async ({ page }, use) => {
        const sfUtils = new SalesforceUtils(page);
        await use(sfUtils);
    },

    /**
     * Pre-authenticated page fixture
     * Use this when you need to start with a logged-in session
     */
    authenticatedPage: async ({ page }, use) => {
        const sfApi = new SalesforceApiUtils(page);
        await sfApi.loginViaFrontdoor();
        await use(page);
    },
});

// Re-export expect for convenience
export { expect };

// Export test data generators
export const testData = {
    /**
     * Generate a unique account name
     */
    generateAccountName: (prefix: string = 'TestAccount'): string => {
        return `${prefix}_${Date.now()}`;
    },

    /**
     * Generate a unique opportunity name
     */
    generateOpportunityName: (prefix: string = 'TestOpportunity'): string => {
        return `${prefix}_${Date.now()}`;
    },

    /**
     * Generate a unique username
     */
    generateUsername: (prefix: string = 'testuser'): string => {
        return `${prefix}_${Date.now()}@test.automation.com`;
    },

    /**
     * Get a future date string in YYYY-MM-DD format
     */
    getFutureDate: (daysFromNow: number = 30): string => {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString().split('T')[0];
    },

    /**
     * Default opportunity stages
     */
    stages: {
        prospecting: 'Prospecting',
        qualification: 'Qualification',
        needsAnalysis: 'Needs Analysis',
        proposal: 'Proposal/Price Quote',
        negotiation: 'Negotiation/Review',
        closedWon: 'Closed Won',
        closedLost: 'Closed Lost',
    },
};
