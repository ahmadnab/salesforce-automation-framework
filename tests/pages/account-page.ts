import { Page, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Account Page Object
 * Handles Account object operations in Lightning Experience
 */
export class AccountPage extends BasePage {
    // Page URLs
    private readonly listViewUrl = '/lightning/o/Account/list?filterName=Recent';
    private readonly newRecordUrl = '/lightning/o/Account/new';

    constructor(page: Page) {
        super(page);
    }

    async navigate(): Promise<void> {
        await this.page.goto(this.listViewUrl);
        await this.sfUtils.waitForPageLoad();
    }

    /**
     * Navigate to new Account form
     */
    async navigateToNewAccount(): Promise<void> {
        await this.page.goto(this.newRecordUrl);
        await this.sfUtils.waitForPageLoad();
    }

    /**
     * Create a new Account with the given name
     * Returns the created Account ID
     */
    async createAccount(accountName: string, additionalFields?: Record<string, string>): Promise<string> {
        await this.navigate();
        await this.sfUtils.clickNewButton();

        // Wait for the modal to appear
        await this.page.locator('.modal-container, records-record-layout-event-broker').first().waitFor({ state: 'visible' });

        // Fill Account Name
        await this.sfUtils.fillField('Account Name', accountName, 'text');

        // Fill any additional fields
        if (additionalFields) {
            for (const [field, value] of Object.entries(additionalFields)) {
                await this.sfUtils.fillField(field, value, 'text');
            }
        }

        // Save
        await this.sfUtils.saveRecord();

        // Wait for toast notification
        await this.sfUtils.waitForToast('success');

        // Get the record ID
        await this.sfUtils.waitForSpinners();
        return await this.sfUtils.getCurrentRecordId();
    }

    /**
     * Create Account via API if it doesn't exist
     * Returns the Account ID
     */
    async createAccountIfNotExists(accountName: string): Promise<string> {
        // First try to find existing account
        const existingAccounts = await this.sfApi.query<{ Id: string }>(
            `SELECT Id FROM Account WHERE Name = '${accountName}' LIMIT 1`
        );

        if (existingAccounts.length > 0) {
            return existingAccounts[0].Id;
        }

        // Create new account via API
        return await this.sfApi.createRecord('Account', { Name: accountName });
    }

    /**
     * Navigate to a specific Account by name
     */
    async navigateToAccountByName(accountName: string): Promise<void> {
        // Use SOQL to find the account first
        const accounts = await this.sfApi.query<{ Id: string }>(
            `SELECT Id FROM Account WHERE Name = '${accountName}' LIMIT 1`
        );

        if (accounts.length === 0) {
            throw new Error(`Account with name "${accountName}" not found`);
        }

        await this.sfUtils.navigateToRecord('Account', accounts[0].Id);
    }

    /**
     * Navigate to a specific Account by ID
     */
    async navigateToAccountById(accountId: string): Promise<void> {
        await this.sfUtils.navigateToRecord('Account', accountId);
    }

    /**
     * Get Account details from the record page
     */
    async getAccountDetails(): Promise<Record<string, string>> {
        await this.sfUtils.waitForSpinners();

        const details: Record<string, string> = {};

        // Get Account Name
        try {
            details['Account Name'] = await this.sfUtils.getFieldValue('Account Name');
        } catch {
            // Field may not be visible
        }

        return details;
    }

    /**
     * Click on Opportunities related list tab
     */
    async openOpportunitiesRelatedList(): Promise<void> {
        await this.sfUtils.waitForSpinners();

        // Click on Related tab if not already there
        const relatedTab = this.page.locator('a[data-label="Related"], li.uiTabBar__item:has-text("Related")');
        if (await relatedTab.isVisible()) {
            await relatedTab.click();
            await this.sfUtils.waitForSpinners();
        }

        // Find and expand Opportunities related list if needed
        const opportunitiesHeader = this.page.locator('span.slds-truncate:has-text("Opportunities"), h2:has-text("Opportunities")');
        await opportunitiesHeader.scrollIntoViewIfNeeded();
    }

    /**
     * Verify an Opportunity appears in the related list
     */
    async verifyOpportunityInRelatedList(opportunityName: string): Promise<boolean> {
        await this.openOpportunitiesRelatedList();

        // Look for the opportunity in the related list
        const opportunityLink = this.page.locator(
            `force-list-view-manager-related-list article:has-text("Opportunities") a:has-text("${opportunityName}"), ` +
            `lst-related-list-single-container:has-text("Opportunities") a:has-text("${opportunityName}"), ` +
            `lightning-accordion-section:has-text("Opportunities") a:has-text("${opportunityName}")`
        );

        return await opportunityLink.first().isVisible({ timeout: 5000 }).catch(() => false);
    }

    /**
     * Click on an Opportunity in the related list
     */
    async clickOpportunityInRelatedList(opportunityName: string): Promise<void> {
        await this.openOpportunitiesRelatedList();

        const opportunityLink = this.page.locator(
            `a:has-text("${opportunityName}")`
        ).first();

        await opportunityLink.click();
        await this.sfUtils.waitForPageLoad();
    }

    /**
     * Delete Account by ID (cleanup)
     */
    async deleteAccount(accountId: string): Promise<void> {
        await this.sfApi.deleteRecord('Account', accountId);
    }
}

export default AccountPage;
