import { Page, Locator, expect } from '@playwright/test';
import { config } from '../../config/environment';

export class SalesforceUtils {
    constructor(private page: Page) { }

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
            }).catch(() => { });
        }
    }

    async waitForPageLoad(): Promise<void> {
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForLoadState('networkidle').catch(() => { });
        await this.waitForSpinners();
        await this.page.locator('.oneContent, .desktop').first().waitFor({
            state: 'visible',
            timeout: config.timeouts.navigation
        }).catch(() => { });
    }

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
                expect(toastClass).toContain(typeMap[expectedType]);
            }
        }

        await toastContainer.locator('button.slds-notify__close, lightning-button-icon').click().catch(() => { });
        return messageText;
    }

    async waitForToastDisappear(): Promise<void> {
        await this.page.locator('div.toastContainer').waitFor({
            state: 'hidden',
            timeout: config.timeouts.action
        }).catch(() => { });
    }

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
        const inputSelectors = [
            `lightning-input[field-label="${label}"] input`,
            `lightning-input-field[field-name*="${label}"] input`,
            `input[name="${label}"]`,
            `//label[contains(text(),"${label}")]/following::input[1]`,
            `lightning-textarea[field-label="${label}"] textarea`,
        ];

        for (const selector of inputSelectors) {
            const input = this.page.locator(selector);
            if (await input.first().isVisible({ timeout: 2000 }).catch(() => false)) {
                await input.first().clear();
                await input.first().fill(value);
                return;
            }
        }

        const labelElement = this.page.locator(`label:has-text("${label}"), span.slds-form-element__label:has-text("${label}")`).first();
        if (await labelElement.isVisible()) {
            await labelElement.click();
            await this.page.keyboard.type(value);
            return;
        }
        throw new Error(`Input field with label "${label}" not found`);
    }

    private async fillCombobox(label: string, value: string): Promise<void> {
        const comboboxSelectors = [
            `lightning-combobox[label="${label}"]`,
            `lightning-picklist[data-field="${label}"]`,
            `//label[contains(text(),"${label}")]/ancestor::lightning-combobox`,
            `//span[contains(text(),"${label}")]/ancestor::lightning-combobox`,
        ];

        let combobox: Locator | null = null;
        for (const selector of comboboxSelectors) {
            const element = this.page.locator(selector);
            if (await element.first().isVisible({ timeout: 2000 }).catch(() => false)) {
                combobox = element.first();
                break;
            }
        }

        if (!combobox) {
            const formElement = this.page.locator(`div.slds-form-element:has(label:has-text("${label}")) lightning-base-combobox`).first();
            if (await formElement.isVisible({ timeout: 2000 }).catch(() => false)) {
                combobox = formElement;
            }
        }

        if (!combobox) throw new Error(`Combobox with label "${label}" not found`);

        await combobox.locator('button, input[role="combobox"], [role="combobox"]').first().click();
        await this.page.waitForTimeout(500);
        await this.page.locator(`lightning-base-combobox-item[data-value="${value}"], [role="option"]:has-text("${value}")`).first().click();
        await this.waitForSpinners();
    }

    private async fillLookup(label: string, value: string): Promise<void> {
        const lookupSelectors = [
            `lightning-lookup[label="${label}"]`,
            `lightning-input-field[data-field="${label}"] lightning-lookup`,
            `force-lookup:has(label:has-text("${label}"))`,
            `//label[contains(text(),"${label}")]/ancestor::lightning-grouped-combobox`,
        ];

        let lookupInput: Locator | null = null;
        for (const selector of lookupSelectors) {
            const element = this.page.locator(selector);
            if (await element.first().isVisible({ timeout: 2000 }).catch(() => false)) {
                lookupInput = element.first().locator('input').first();
                break;
            }
        }

        if (!lookupInput) {
            const labelEl = this.page.locator(`label:has-text("${label}")`).first();
            lookupInput = labelEl.locator('xpath=following::input[1]');
        }

        await lookupInput.clear();
        await lookupInput.fill(value);
        await this.page.waitForTimeout(1000);
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
            await this.page.keyboard.press('Escape');
        } else {
            await this.fillTextInput(label, value);
        }
    }

    async getFieldValue(fieldLabel: string): Promise<string> {
        await this.waitForSpinners();

        const valueSelectors = [
            `force-record-output-field:has(span:text-is("${fieldLabel}")) lightning-formatted-text`,
            `force-record-output-field:has(span:text-is("${fieldLabel}")) lightning-formatted-number`,
            `force-record-output-field:has(span:text-is("${fieldLabel}")) a`,
            `force-record-output-field:has(span:text-is("${fieldLabel}")) lightning-formatted-url`,
            `records-record-layout-item[field-label="${fieldLabel}"] lightning-formatted-text`,
            `records-record-layout-item[field-label="${fieldLabel}"] lightning-formatted-number`,
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

    async navigateToObject(objectName: string): Promise<void> {
        await this.page.goto(`/lightning/o/${objectName}/list?filterName=Recent`);
        await this.waitForPageLoad();
    }

    async navigateToRecord(objectName: string, recordId: string): Promise<void> {
        await this.page.goto(`/lightning/r/${objectName}/${recordId}/view`);
        await this.waitForPageLoad();
    }

    async clickNewButton(): Promise<void> {
        await this.waitForSpinners();
        const newButton = this.page.locator('button:has-text("New"), a[title="New"], lightning-button:has-text("New")').first();
        await newButton.click();
        await this.waitForSpinners();
        await this.page.locator('records-record-layout-event-broker, .modal-container, .slds-modal').first()
            .waitFor({ state: 'visible', timeout: config.timeouts.action })
            .catch(() => { });
    }

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

    async getCurrentRecordId(): Promise<string> {
        const url = this.page.url();
        const match = url.match(/\/([a-zA-Z0-9]{15,18})\//);
        return match ? match[1] : '';
    }

    async isFieldEditable(fieldLabel: string): Promise<boolean> {
        await this.waitForSpinners();
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

    async clickRecordAction(actionName: string): Promise<void> {
        await this.waitForSpinners();
        await this.page.locator('runtime_platform_actions-actions-ribbon lightning-button-menu button, [data-target-reveals*="action"]').first().click();
        await this.page.waitForTimeout(500);
        await this.page.locator(`runtime_platform_actions-action-renderer a[title="${actionName}"], lightning-menu-item[title="${actionName}"]`).first().click();
        await this.waitForSpinners();
    }

    async canEditRecord(): Promise<boolean> {
        await this.waitForSpinners();
        const editButton = this.page.locator(
            'button[name="Edit"]:visible, a[data-target-reveals*="Edit"]:visible, lightning-button:has-text("Edit"):visible'
        ).first();
        return await editButton.isVisible({ timeout: 2000 }).catch(() => false);
    }
}

export default SalesforceUtils;
