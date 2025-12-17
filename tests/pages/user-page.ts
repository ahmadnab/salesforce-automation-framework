import { Page } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * User Management Page Object
 * Handles user creation and permission management
 */
export class UserPage extends BasePage {
    private readonly usersListUrl = '/lightning/setup/ManageUsers/home';
    private readonly newUserUrl = '/lightning/setup/ManageUsers/page?address=%2F005%2Fe';

    constructor(page: Page) {
        super(page);
    }

    async navigate(): Promise<void> {
        await this.page.goto(this.usersListUrl);
        await this.sfUtils.waitForPageLoad();
    }

    /**
     * Create a new user via API
     */
    async createUserViaApi(userData: {
        firstName: string;
        lastName: string;
        email: string;
        username: string;
        profileName: string;
        alias?: string;
    }): Promise<string> {
        // Get profile ID
        const profileId = await this.sfApi.getProfileIdByName(userData.profileName);
        if (!profileId) {
            throw new Error(`Profile "${userData.profileName}" not found`);
        }

        return await this.sfApi.createUser({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            username: userData.username,
            profileId: profileId,
            alias: userData.alias,
        });
    }

    /**
     * Create a Standard Platform User
     * This profile has limited access - mainly for viewing
     */
    async createStandardPlatformUser(userData: {
        firstName: string;
        lastName: string;
        email: string;
        username: string;
    }): Promise<string> {
        return await this.createUserViaApi({
            ...userData,
            profileName: 'Standard Platform User',
        });
    }

    /**
     * Set password for a user via API
     */
    async setUserPassword(userId: string, password: string): Promise<void> {
        const endpoint = `/sobjects/User/${userId}/password`;
        await this.sfApi.restCall('POST', endpoint, { NewPassword: password });
    }

    /**
     * Login as another user
     * For scratch orgs, we can use Login-As functionality
     */
    async loginAsUser(username: string): Promise<void> {
        // Get user ID
        const users = await this.sfApi.query<{ Id: string }>(
            `SELECT Id FROM User WHERE Username = '${username}' LIMIT 1`
        );

        if (users.length === 0) {
            throw new Error(`User "${username}" not found`);
        }

        const userId = users[0].Id;

        // Navigate to setup and use Login As feature
        await this.page.goto(`/servlet/servlet.su?oid=${await this.getOrgId()}&suorgadminid=${userId}&retURL=%2Fhome%2Fhome.jsp&targetURL=%2Fhome%2Fhome.jsp`);
        await this.sfUtils.waitForPageLoad();
    }

    /**
     * Get the current org ID
     */
    private async getOrgId(): Promise<string> {
        const orgInfo = await this.sfApi.query<{ Id: string }>(
            'SELECT Id FROM Organization LIMIT 1'
        );
        return orgInfo[0]?.Id || '';
    }

    /**
     * Assign a permission set to a user
     */
    async assignPermissionSetToUser(userId: string, permissionSetName: string): Promise<void> {
        await this.sfApi.assignPermissionSet(userId, permissionSetName);
    }

    /**
     * Check if a user has a specific permission set
     */
    async userHasPermissionSet(userId: string, permissionSetName: string): Promise<boolean> {
        const assignments = await this.sfApi.query<{ Id: string }>(
            `SELECT Id FROM PermissionSetAssignment 
       WHERE AssigneeId = '${userId}' 
       AND PermissionSet.Name = '${permissionSetName}'`
        );
        return assignments.length > 0;
    }

    /**
     * Get user details via API
     */
    async getUserDetails(userId: string): Promise<Record<string, unknown>> {
        return await this.sfApi.getRecord('User', userId, [
            'Id', 'Username', 'FirstName', 'LastName', 'Email', 'ProfileId', 'IsActive'
        ]);
    }

    /**
     * Deactivate a user (for cleanup)
     */
    async deactivateUser(userId: string): Promise<void> {
        await this.sfApi.updateRecord('User', userId, { IsActive: false });
    }

    /**
     * Get user by username
     */
    async getUserIdByUsername(username: string): Promise<string | null> {
        const users = await this.sfApi.query<{ Id: string }>(
            `SELECT Id FROM User WHERE Username = '${username}' LIMIT 1`
        );
        return users.length > 0 ? users[0].Id : null;
    }

    /**
     * Check if user exists
     */
    async userExists(username: string): Promise<boolean> {
        const userId = await this.getUserIdByUsername(username);
        return userId !== null;
    }
}

export default UserPage;
