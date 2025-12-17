import { Page, Locator, expect } from '@playwright/test';
import { config } from '../../config/environment';

/**
 * Salesforce Lightning Utilities
 * Handles common Salesforce-specific challenges:
 * - Loading spinners and async page behavior
 * - Toast messages
 * - Dynamic DOM elements
 * - Lightning component loading states
 */
export class SalesforceUtils {
    constructor(private page: Page) { }

    /**
     * Wait for all Lightning spinners to disappear
     * Salesforce uses multiple spinner types that need to be handled
     */
    async waitForSpinners(): Promise<void> {
        const spinnerSelectors = [
            '.slds-spinner_container',
            '.slds-spinner',
            '[data-aura-rendered-by] .slds-spinner',
            '.forceSpinnerContainer',
            '.loadingSpinner',
            'lightning-spinner',
        ];

        for (const selector of spinnerSelectors) {
            await this.page.locator(selector).waitFor({
                state: 'hidden',
                timeout: config.timeouts.spinnerWait
            }).catch(() => {/* Spinner may not exist */ });
        }
    }

    /**
     * Wait for Lightning page to fully load
     * Combines spinner waits with network idle detection
     */
    async waitForPageLoad(): Promise<void> {
        // Wait for document ready state
        await this.page.waitForLoadState('domcontentloaded');

        // Wait for network to be mostly idle
        await this.page.waitForLoadState('networkidle').catch(() => {
            // Network may never be truly idle in Lightning, continue after timeout
        });

        // Wait for spinners
        await this.waitForSpinners();

        // Wait for main content area to be visible
        await this.page.locator('.oneContent, .desktop').first().waitFor({
            state: 'visible',
            timeout: config.timeouts.navigation
        }).catch(() => {/* May not exist in all contexts */ });
    }

    /**
     * Capture and validate toast messages
     * Returns the toast message text
     */
    async waitForToast(expectedType?: 'success' | 'error' | 'warning' | 'info'): Promise<string> {
        const toastContainer = this.page.locator('div.toastContainer');
        await toastContainer.waitFor({ state: 'visible', timeout: config.timeouts.action });

        const toastMessage = toastContainer.locator('.toastMessage, .slds-notify__content');
        const messageText = await toastMessage.textContent() || '';

        if (expectedType) {
            const toastClass = await toastContainer.locator('.slds-notify, .forceToastMessage').getAttribute('class');
            const typeMap = {
                success: 'slds-notify--success',
                error: 'slds-notify--error',
                warning: 'slds-notify--warning',
                info: 'slds-notify--info',
            };

            if (toastClass && expectedType in typeMap) {
                expect(toastClass).toContain(typeMap[expectedType as keyof typeof typeMap]);
            }
        }

        // Close toast by clicking the close button
        await toastContainer.locator('button.slds-notify__close, lightning-button-icon').click().catch(() => {
            // Toast may auto-dismiss
        });

        return messageText;
    }

    /**
     * Wait for toast to disappear (useful after save operations)
     */
    async waitForToastDisappear(): Promise<void> {
        await this.page.locator('div.toastContainer').waitFor({
            state: 'hidden',
            timeout: config.timeouts.action
        }).catch(() => {/* May already be gone */ });
    }

    /**
     * Click a Lightning button by its label text
     * Handles various button types in Lightning
     */
    async clickButton(label: string): Promise<void> {
        await this.waitForSpinners();

        const buttonSelectors = [
            `button:has-text("${label}")`,
            `lightning-button:has-text("${label}")`,
            `a.slds-button:has-text("${label}")`,
            `input[value="${label}"]`,
            `[title="${label}"]`,
        ];

        for (const selector of buttonSelectors) {
            const button = this.page.locator(selector).first();
            if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
                await button.click();
                await this.waitForSpinners();
                return;
            }
        }

        throw new Error(`Button with label "${label}" not found`);
    }

    /**
     * Fill a Lightning input field by its label
     * Handles various input types including combobox, lookup, and standard inputs
     */
    async fillField(label: string, value: string, fieldType: 'text' | 'combobox' | 'lookup' | 'date' | 'currency' = 'text'): Promise<void> {
        await this.waitForSpinners();

        switch (fieldType) {
            case 'text':
            case 'currency':
                await this.fillTextInput(label, value);
                break;
            case 'combobox':
                await this.fillCombobox(label, value);
                break;
            case 'lookup':
                await this.fillLookup(label, value);
                break;
            case 'date':
                await this.fillDateInput(label, value);
                break;
        }
    }

    private async fillTextInput(label: string, value: string): Promise<void> {
        // Try multiple selectors for Lightning input fields
        const inputSelectors = [
            `lightning-input[field-label="${label}"] input`,
            `lightning-input-field[field-name*="${label}"] input`,
            `input[name="${label}"]`,
            `//label[contains(text(),"${label}")]/following::input[1]`,
            `lightning-textarea[field-label="${label}"] textarea`,
        ];

        for (const selector of inputSelectors) {
            try {
                const input = selector.startsWith('//')
                    ? this.page.locator(selector)
                    : this.page.locator(selector);

                if (await input.first().isVisible({ timeout: 2000 }).catch(() => false)) {
                    await input.first().clear();
                    await input.first().fill(value);
                    return;
                }
            } catch {
                continue;
            }
        }

        // Fallback: find label and click to focus, then type
        const labelElement = this.page.locator(`label:has-text("${label}"), span.slds-form-element__label:has-text("${label}")`).first();
        if (await labelElement.isVisible()) {
            await labelElement.click();
            await this.page.keyboard.type(value);
            return;
        }

        throw new Error(`Input field with label "${label}" not found`);
    }

    private async fillCombobox(label: string, value: string): Promise<void> {
        // Find the combobox container
        const comboboxSelectors = [
            `lightning-combobox[label="${label}"]`,
            `lightning-picklist[data-field="${label}"]`,
            `//label[contains(text(),"${label}")]/ancestor::lightning-combobox`,
            `//span[contains(text(),"${label}")]/ancestor::lightning-combobox`,
        ];

        let combobox: Locator | null = null;

        for (const selector of comboboxSelectors) {
            const element = selector.startsWith('//')
                ? this.page.locator(selector)
                : this.page.locator(selector);

            if (await element.first().isVisible({ timeout: 2000 }).catch(() => false)) {
                combobox = element.first();
                break;
            }
        }

        if (!combobox) {
            // Try finding by form element with label
            const formElement = this.page.locator(`div.slds-form-element:has(label:has-text("${label}")) lightning-base-combobox`).first();
            if (await formElement.isVisible({ timeout: 2000 }).catch(() => false)) {
                combobox = formElement;
            }
        }

        if (!combobox) {
            throw new Error(`Combobox with label "${label}" not found`);
        }

        // Click to open dropdown
        await combobox.locator('button, input[role="combobox"], [role="combobox"]').first().click();
        await this.page.waitForTimeout(500); // Wait for dropdown animation

        // Select the value
        const option = this.page.locator(`lightning-base-combobox-item[data-value="${value}"], [role="option"]:has-text("${value}")`).first();
        await option.click();
        await this.waitForSpinners();
    }

    private async fillLookup(label: string, value: string): Promise<void> {
        // Find lookup field
        const lookupSelectors = [
            `lightning-lookup[label="${label}"]`,
            `lightning-input-field[data-field="${label}"] lightning-lookup`,
            `force-lookup:has(label:has-text("${label}"))`,
            `//label[contains(text(),"${label}")]/ancestor::lightning-grouped-combobox`,
        ];

        let lookupInput: Locator | null = null;

        for (const selector of lookupSelectors) {
            const element = selector.startsWith('//')
                ? this.page.locator(selector)
                : this.page.locator(selector);

            if (await element.first().isVisible({ timeout: 2000 }).catch(() => false)) {
                lookupInput = element.first().locator('input').first();
                break;
            }
        }

        if (!lookupInput) {
            // Fallback to finding input near label
            const label2 = this.page.locator(`label:has-text("${label}")`).first();
            lookupInput = label2.locator('xpath=following::input[1]');
        }

        // Clear and type search value
        await lookupInput.clear();
        await lookupInput.fill(value);
        await this.page.waitForTimeout(1000); // Wait for search results

        // Wait for and click the result
        const result = this.page.locator(`lightning-base-combobox-item:has-text("${value}"), [role="option"]:has-text("${value}")`).first();
        await result.waitFor({ state: 'visible', timeout: config.timeouts.action });
        await result.click();
        await this.waitForSpinners();
    }

    private async fillDateInput(label: string, value: string): Promise<void> {
        const dateInput = this.page.locator(`lightning-input[label="${label}"] input, lightning-datepicker[label="${label}"] input`).first();

        if (await dateInput.isVisible({ timeout: 2000 })) {
            await dateInput.clear();
            await dateInput.fill(value);
            await this.page.keyboard.press('Escape'); // Close date picker
        } else {
            await this.fillTextInput(label, value);
        }
    }

    /**
     * Get the value of a field from a record detail page
     */
    async getFieldValue(fieldLabel: string): Promise<string> {
        await this.waitForSpinners();

        const valueSelectors = [
            // Force record output field
            `force-record-output-field:has(span:text-is("${fieldLabel}")) lightning-formatted-text`,
            `force-record-output-field:has(span:text-is("${fieldLabel}")) lightning-formatted-number`,
            `force-record-output-field:has(span:text-is("${fieldLabel}")) a`,
            `force-record-output-field:has(span:text-is("${fieldLabel}")) lightning-formatted-url`,
            // Record layout item
            `records-record-layout-item[field-label="${fieldLabel}"] lightning-formatted-text`,
            `records-record-layout-item[field-label="${fieldLabel}"] lightning-formatted-number`,
            // Generic form element
            `div.slds-form-element:has(span:has-text("${fieldLabel}")) .slds-form-element__static`,
        ];

        for (const selector of valueSelectors) {
            const element = this.page.locator(selector).first();
            if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
                return await element.textContent() || '';
            }
        }

        throw new Error(`Field value for "${fieldLabel}" not found`);
    }

    /**
     * Navigate to a Salesforce object home page via app launcher
     */
    async navigateToObject(objectName: string): Promise<void> {
        await this.page.goto(`/lightning/o/${objectName}/list?filterName=Recent`);
        await this.waitForPageLoad();
    }

    /**
     * Navigate to a specific record by ID
     */
    async navigateToRecord(objectName: string, recordId: string): Promise<void> {
        await this.page.goto(`/lightning/r/${objectName}/${recordId}/view`);
        await this.waitForPageLoad();
    }

    /**
     * Click the New button on a list view to create a new record
     */
    async clickNewButton(): Promise<void> {
        await this.waitForSpinners();

        const newButton = this.page.locator('button:has-text("New"), a[title="New"], lightning-button:has-text("New")').first();
        await newButton.click();
        await this.waitForSpinners();

        // Wait for modal or new page to load
        await this.page.locator('records-record-layout-event-broker, .modal-container, .slds-modal').first()
            .waitFor({ state: 'visible', timeout: config.timeouts.action })
            .catch(() => {/* May navigate to new page instead of modal */ });
    }

    /**
     * Save the current record (clicks Save button in modal or page)
     */
    async saveRecord(): Promise<void> {
        await this.waitForSpinners();

        const saveButton = this.page.locator(
            'button[name="SaveEdit"]:has-text("Save"), ' +
            'button.slds-button:has-text("Save"):not(:has-text("Save &")), ' +
            'lightning-button:has-text("Save"):not(:has-text("Save &"))'
        ).first();

        await saveButton.click();
        await this.waitForSpinners();
    }

    /**
     * Get the current record ID from the URL
     */
    async getCurrentRecordId(): Promise<string> {
        const url = this.page.url();
        const match = url.match(/\/([a-zA-Z0-9]{15,18})\//);
        return match ? match[1] : '';
    }

    /**
     * Check if an element is editable (for read-only validation)
     */
    async isFieldEditable(fieldLabel: string): Promise<boolean> {
        await this.waitForSpinners();

        // Try to find edit pencil icon or editable input
        const editIndicators = [
            `force-record-output-field:has(span:text-is("${fieldLabel}")) button[title="Edit"]`,
            `records-record-layout-item[field-label="${fieldLabel}"] button`,
            `lightning-input[label="${fieldLabel}"]:not([disabled])`,
        ];

        for (const selector of editIndicators) {
            if (await this.page.locator(selector).first().isVisible({ timeout: 1000 }).catch(() => false)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Open the record actions menu and click an action
     */
    async clickRecordAction(actionName: string): Promise<void> {
        await this.waitForSpinners();

        // Click the actions dropdown button
        const actionsButton = this.page.locator('runtime_platform_actions-actions-ribbon lightning-button-menu button, [data-target-reveals*="action"]').first();
        await actionsButton.click();
        await this.page.waitForTimeout(500);

        // Click the specific action
        const action = this.page.locator(`runtime_platform_actions-action-renderer a[title="${actionName}"], lightning-menu-item[title="${actionName}"]`).first();
        await action.click();
        await this.waitForSpinners();
    }

    /**
     * Check if user can edit the current record (checks for Edit button)
     */
    async canEditRecord(): Promise<boolean> {
        await this.waitForSpinners();

        const editButton = this.page.locator(
            'button[name="Edit"]:visible, ' +
            'a[data-target-reveals*="Edit"]:visible, ' +
            'lightning-button:has-text("Edit"):visible'
        ).first();

        return await editButton.isVisible({ timeout: 2000 }).catch(() => false);
    }
}

export default SalesforceUtils;
