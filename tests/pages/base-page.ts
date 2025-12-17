import { Page, expect } from '@playwright/test';
import { SalesforceUtils } from '../utils/salesforce-utils';
import { SalesforceApiUtils } from '../utils/salesforce-api';
import { config } from '../../config/environment';

/**
 * Base Page Object for all Salesforce Lightning pages
 * Provides common functionality and navigation
 */
export abstract class BasePage {
    public sfUtils: SalesforceUtils;
    public sfApi: SalesforceApiUtils;

    constructor(protected page: Page) {
        this.sfUtils = new SalesforceUtils(page);
        this.sfApi = new SalesforceApiUtils(page);
    }

    /**
     * Navigate to this page - to be implemented by subclasses
     */
    abstract navigate(): Promise<void>;

    /**
     * Login to Salesforce using frontdoor.jsp (bypasses MFA)
     */
    async login(): Promise<void> {
        await this.sfApi.loginViaFrontdoor();
    }

    /**
     * Login with specific credentials (for testing different users)
     */
    async loginAs(username: string, password: string): Promise<void> {
        await this.sfApi.loginAsUser(username, password);
    }

    /**
     * Standard UI login (used when frontdoor is not available)
     */
    async loginViaUI(): Promise<void> {
        await this.page.goto('/');

        // Fill username
        const usernameInput = this.page.locator('#username');
        await usernameInput.fill(config.salesforce.username);

        // Fill password
        const passwordInput = this.page.locator('#password');
        await passwordInput.fill(config.salesforce.password);

        // Click login
        const loginButton = this.page.locator('#Login');
        await loginButton.click();

        await this.sfUtils.waitForPageLoad();
    }

    /**
     * Navigate to an object's list view
     */
    async navigateToObjectList(objectName: string): Promise<void> {
        await this.sfUtils.navigateToObject(objectName);
    }

    /**
     * Navigate to a specific record
     */
    async navigateToRecord(objectName: string, recordId: string): Promise<void> {
        await this.sfUtils.navigateToRecord(objectName, recordId);
    }

    /**
     * Get the current page title
     */
    async getPageTitle(): Promise<string> {
        await this.sfUtils.waitForSpinners();
        const title = this.page.locator('h1.slds-page-header__title, .entityNameTitle, records-entity-label');
        return await title.first().textContent() || '';
    }

    /**
     * Open global search and search for a term
     */
    async globalSearch(searchTerm: string): Promise<void> {
        const searchButton = this.page.locator('button.slds-global-actions__item[data-aura-class="forceSearchDesktopSearchButton"], button[aria-label="Search"]');
        await searchButton.click();

        const searchInput = this.page.locator('input[type="search"], input.slds-input[placeholder*="Search"]');
        await searchInput.fill(searchTerm);
        await this.page.keyboard.press('Enter');

        await this.sfUtils.waitForPageLoad();
    }

    /**
     * Click on the App Launcher
     */
    async openAppLauncher(): Promise<void> {
        const appLauncher = this.page.locator('.slds-icon-waffle');
        await appLauncher.click();
        await this.page.locator('.slds-app-launcher__tile').first().waitFor({ state: 'visible' });
    }

    /**
     * Navigate to a specific app via App Launcher
     */
    async navigateToApp(appName: string): Promise<void> {
        await this.openAppLauncher();

        const searchInput = this.page.locator('input[placeholder*="Search apps"]');
        await searchInput.fill(appName);

        const appTile = this.page.locator(`one-app-launcher-menu-item:has-text("${appName}")`);
        await appTile.click();

        await this.sfUtils.waitForPageLoad();
    }

    /**
     * Logout from Salesforce
     */
    async logout(): Promise<void> {
        // Click on user profile menu
        const profileMenu = this.page.locator('.branding-user-profile, span.uiImage[data-aura-class="uiImage"]').first();
        await profileMenu.click();

        // Click logout
        const logoutLink = this.page.locator('a[href*="logout"]');
        await logoutLink.click();

        // Wait for login page
        await this.page.waitForURL('**/login*');
    }
}

export default BasePage;
