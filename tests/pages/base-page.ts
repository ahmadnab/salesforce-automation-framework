import { Page } from '@playwright/test';
import { SalesforceUtils } from '../utils/salesforce-utils';
import { SalesforceApiUtils } from '../utils/salesforce-api';

export abstract class BasePage {
    public sfUtils: SalesforceUtils;
    public sfApi: SalesforceApiUtils;

    constructor(protected page: Page) {
        this.sfUtils = new SalesforceUtils(page);
        this.sfApi = new SalesforceApiUtils(page);
    }

    abstract navigate(): Promise<void>;

    async login(): Promise<void> {
        await this.sfApi.loginViaFrontdoor();
    }

    async navigateToObjectList(objectName: string): Promise<void> {
        await this.sfUtils.navigateToObject(objectName);
    }

    async navigateToRecord(objectName: string, recordId: string): Promise<void> {
        await this.sfUtils.navigateToRecord(objectName, recordId);
    }

    async getPageTitle(): Promise<string> {
        await this.sfUtils.waitForSpinners();
        const title = this.page.locator('h1.slds-page-header__title, .entityNameTitle, records-entity-label');
        return await title.first().textContent() || '';
    }

    async globalSearch(searchTerm: string): Promise<void> {
        const searchButton = this.page.locator('button.slds-global-actions__item[data-aura-class="forceSearchDesktopSearchButton"], button[aria-label="Search"]');
        await searchButton.click();
        const searchInput = this.page.locator('input[type="search"], input.slds-input[placeholder*="Search"]');
        await searchInput.fill(searchTerm);
        await this.page.keyboard.press('Enter');
        await this.sfUtils.waitForPageLoad();
    }

    async openAppLauncher(): Promise<void> {
        await this.page.locator('.slds-icon-waffle').click();
        await this.page.locator('.slds-app-launcher__tile').first().waitFor({ state: 'visible' });
    }

    async navigateToApp(appName: string): Promise<void> {
        await this.openAppLauncher();
        await this.page.locator('input[placeholder*="Search apps"]').fill(appName);
        await this.page.locator(`one-app-launcher-menu-item:has-text("${appName}")`).click();
        await this.sfUtils.waitForPageLoad();
    }

    async logout(): Promise<void> {
        await this.page.locator('.branding-user-profile, span.uiImage[data-aura-class="uiImage"]').first().click();
        await this.page.locator('a[href*="logout"]').click();
        await this.page.waitForURL('**/login*');
    }
}

export default BasePage;
