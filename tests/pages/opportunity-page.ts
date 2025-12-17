import { Page, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Opportunity Page Object
 * Handles Opportunity object operations in Lightning Experience
 * Includes custom Quantity__c field support
 */
export class OpportunityPage extends BasePage {
    // Page URLs
    private readonly listViewUrl = '/lightning/o/Opportunity/list?filterName=Recent';
    private readonly newRecordUrl = '/lightning/o/Opportunity/new';

    constructor(page: Page) {
        super(page);
    }

    async navigate(): Promise<void> {
        await this.page.goto(this.listViewUrl);
        await this.sfUtils.waitForPageLoad();
    }

    /**
     * Navigate to new Opportunity form
     */
    async navigateToNewOpportunity(): Promise<void> {
        await this.page.goto(this.newRecordUrl);
        await this.sfUtils.waitForPageLoad();
    }

    /**
     * Open New Opportunity modal from list view
     */
    async openNewOpportunityModal(): Promise<void> {
        await this.navigate();
        await this.sfUtils.clickNewButton();

        // Wait for modal
        await this.page.locator('.modal-container, records-record-layout-event-broker, .slds-modal').first()
            .waitFor({ state: 'visible' });
    }

    /**
     * Fill Opportunity form with provided data
     */
    async fillOpportunityForm(data: {
        name: string;
        accountName?: string;
        closeDate: string;
        stage: string;
        amount?: string;
        quantity?: number;
        probability?: string;
        type?: string;
        leadSource?: string;
        description?: string;
        nextStep?: string;
    }): Promise<void> {
        await this.sfUtils.waitForSpinners();

        // Required fields
        await this.sfUtils.fillField('Opportunity Name', data.name, 'text');
        await this.sfUtils.fillField('Close Date', data.closeDate, 'text');
        await this.sfUtils.fillField('Stage', data.stage, 'combobox');

        // Account lookup
        if (data.accountName) {
            await this.sfUtils.fillField('Account Name', data.accountName, 'lookup');
        }

        // Optional fields
        if (data.amount) {
            await this.sfUtils.fillField('Amount', data.amount, 'currency');
        }

        if (data.quantity !== undefined) {
            await this.sfUtils.fillField('Quantity', data.quantity.toString(), 'text');
        }

        if (data.probability) {
            await this.sfUtils.fillField('Probability', data.probability, 'text');
        }

        if (data.type) {
            await this.sfUtils.fillField('Type', data.type, 'combobox');
        }

        if (data.leadSource) {
            await this.sfUtils.fillField('Lead Source', data.leadSource, 'combobox');
        }

        if (data.description) {
            await this.sfUtils.fillField('Description', data.description, 'text');
        }

        if (data.nextStep) {
            await this.sfUtils.fillField('Next Step', data.nextStep, 'text');
        }
    }

    /**
     * Create a new Opportunity with the given data
     * Returns the created Opportunity ID
     */
    async createOpportunity(data: {
        name: string;
        accountName?: string;
        closeDate: string;
        stage: string;
        amount?: string;
        quantity?: number;
        probability?: string;
        type?: string;
        leadSource?: string;
        description?: string;
        nextStep?: string;
    }): Promise<string> {
        await this.openNewOpportunityModal();
        await this.fillOpportunityForm(data);
        await this.sfUtils.saveRecord();

        // Wait for toast
        await this.sfUtils.waitForToast('success');

        // Get record ID
        await this.sfUtils.waitForSpinners();
        return await this.sfUtils.getCurrentRecordId();
    }

    /**
     * Create Opportunity via API
     * Returns the Opportunity ID
     */
    async createOpportunityViaApi(data: {
        name: string;
        accountId?: string;
        closeDate: string;
        stageName: string;
        amount?: number;
        quantity?: number;
        probability?: number;
    }): Promise<string> {
        const opportunityRecord: Record<string, unknown> = {
            Name: data.name,
            CloseDate: data.closeDate,
            StageName: data.stageName,
        };

        if (data.accountId) {
            opportunityRecord.AccountId = data.accountId;
        }

        if (data.amount !== undefined) {
            opportunityRecord.Amount = data.amount;
        }

        if (data.quantity !== undefined) {
            opportunityRecord.Quantity__c = data.quantity;
        }

        if (data.probability !== undefined) {
            opportunityRecord.Probability = data.probability;
        }

        return await this.sfApi.createRecord('Opportunity', opportunityRecord);
    }

    /**
     * Navigate to an Opportunity by name
     */
    async navigateToOpportunityByName(opportunityName: string): Promise<void> {
        const opportunities = await this.sfApi.query<{ Id: string }>(
            `SELECT Id FROM Opportunity WHERE Name = '${opportunityName}' LIMIT 1`
        );

        if (opportunities.length === 0) {
            throw new Error(`Opportunity with name "${opportunityName}" not found`);
        }

        await this.sfUtils.navigateToRecord('Opportunity', opportunities[0].Id);
    }

    /**
     * Navigate to an Opportunity by ID
     */
    async navigateToOpportunityById(opportunityId: string): Promise<void> {
        await this.sfUtils.navigateToRecord('Opportunity', opportunityId);
    }

    /**
     * Get Opportunity details from the record page
     */
    async getOpportunityDetails(): Promise<Record<string, string>> {
        await this.sfUtils.waitForSpinners();

        const details: Record<string, string> = {};
        const fields = [
            'Opportunity Name',
            'Account Name',
            'Close Date',
            'Stage',
            'Amount',
            'Quantity',
            'Probability',
            'Type',
            'Lead Source',
            'Description',
            'Next Step',
        ];

        for (const field of fields) {
            try {
                details[field] = await this.sfUtils.getFieldValue(field);
            } catch {
                // Field may not be visible or have no value
            }
        }

        return details;
    }

    /**
     * Verify field values on the Opportunity detail page
     */
    async verifyOpportunityDetails(expectedData: Record<string, string>): Promise<void> {
        await this.sfUtils.waitForSpinners();

        for (const [field, expectedValue] of Object.entries(expectedData)) {
            const actualValue = await this.sfUtils.getFieldValue(field);
            expect(actualValue).toContain(expectedValue);
        }
    }

    /**
     * Check if the Edit button is visible/accessible
     */
    async canEdit(): Promise<boolean> {
        return await this.sfUtils.canEditRecord();
    }

    /**
     * Check if a specific field is editable
     */
    async isFieldEditable(fieldLabel: string): Promise<boolean> {
        return await this.sfUtils.isFieldEditable(fieldLabel);
    }

    /**
     * Click Edit button on the record
     */
    async clickEdit(): Promise<void> {
        const editButton = this.page.locator(
            'button[name="Edit"], ' +
            'lightning-button:has-text("Edit"), ' +
            'a[title="Edit"]'
        ).first();

        await editButton.click();
        await this.sfUtils.waitForSpinners();
    }

    /**
     * Get the Opportunity record ID from API by name
     */
    async getOpportunityIdByName(opportunityName: string): Promise<string | null> {
        const opportunities = await this.sfApi.query<{ Id: string }>(
            `SELECT Id FROM Opportunity WHERE Name = '${opportunityName}' LIMIT 1`
        );
        return opportunities.length > 0 ? opportunities[0].Id : null;
    }

    /**
     * Delete Opportunity by ID (cleanup)
     */
    async deleteOpportunity(opportunityId: string): Promise<void> {
        await this.sfApi.deleteRecord('Opportunity', opportunityId);
    }

    /**
     * Get Opportunity data via API
     */
    async getOpportunityViaApi(opportunityId: string): Promise<Record<string, unknown>> {
        return await this.sfApi.getRecord(
            'Opportunity',
            opportunityId,
            ['Id', 'Name', 'AccountId', 'CloseDate', 'StageName', 'Amount', 'Quantity__c', 'Probability']
        );
    }
}

export default OpportunityPage;
