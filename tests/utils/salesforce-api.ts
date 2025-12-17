import { Page } from '@playwright/test';
import { config } from '../../config/environment';
import { SalesforceUtils } from './salesforce-utils';

/**
 * Salesforce API Utilities
 * Provides REST API operations for setup, teardown, and validation
 * Uses the frontdoor.jsp approach for session-based login when possible
 */
export class SalesforceApiUtils {
    private accessToken: string = '';
    private instanceUrl: string = '';
    private sfUtils: SalesforceUtils;

    constructor(private page: Page) {
        this.sfUtils = new SalesforceUtils(page);
    }

    /**
     * Authenticate via SOAP API to get session ID
     * This bypasses MFA for automation
     */
    async authenticate(): Promise<{ accessToken: string; instanceUrl: string }> {
        const loginUrl = config.salesforce.isSandbox
            ? 'https://test.salesforce.com/services/Soap/u/60.0'
            : 'https://login.salesforce.com/services/Soap/u/60.0';

        const soapBody = `<?xml version="1.0" encoding="utf-8" ?>
    <env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
      <env:Body>
        <n1:login xmlns:n1="urn:partner.soap.sforce.com">
          <n1:username>${config.salesforce.username}</n1:username>
          <n1:password>${config.salesforce.password}</n1:password>
        </n1:login>
      </env:Body>
    </env:Envelope>`;

        const response = await this.page.request.post(loginUrl, {
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8',
                'SOAPAction': 'login',
            },
            data: soapBody,
        });

        const responseText = await response.text();

        // Extract session ID and server URL from SOAP response
        const sessionIdMatch = responseText.match(/<sessionId>(.*?)<\/sessionId>/);
        const serverUrlMatch = responseText.match(/<serverUrl>(.*?)<\/serverUrl>/);

        if (!sessionIdMatch || !serverUrlMatch) {
            throw new Error('Failed to authenticate with Salesforce SOAP API');
        }

        this.accessToken = sessionIdMatch[1];

        // Extract instance URL from server URL
        const serverUrl = serverUrlMatch[1];
        const instanceMatch = serverUrl.match(/(https:\/\/[^/]+)/);
        this.instanceUrl = instanceMatch ? instanceMatch[1] : config.salesforce.instanceUrl;

        return {
            accessToken: this.accessToken,
            instanceUrl: this.instanceUrl,
        };
    }

    /**
     * Login using frontdoor.jsp with session ID
     * This bypasses MFA and directly establishes browser session
     */
    async loginViaFrontdoor(): Promise<void> {
        const { accessToken, instanceUrl } = await this.authenticate();

        // Navigate to frontdoor.jsp to establish browser session
        const frontdoorUrl = `${instanceUrl}/secur/frontdoor.jsp?sid=${accessToken}`;
        await this.page.goto(frontdoorUrl);

        await this.sfUtils.waitForPageLoad();
    }

    /**
     * Make a REST API call to Salesforce
     */
    async restCall<T>(
        method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
        endpoint: string,
        data?: Record<string, unknown>
    ): Promise<T> {
        if (!this.accessToken) {
            await this.authenticate();
        }

        const url = `${this.instanceUrl}/services/data/v${config.salesforce.apiVersion}${endpoint}`;

        const options: RequestInit = {
            method,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
        };

        if (data && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        const response = await this.page.request.fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            data: data ? data : undefined,
        });

        if (!response.ok()) {
            const errorText = await response.text();
            throw new Error(`Salesforce API error: ${response.status()} - ${errorText}`);
        }

        // Handle 204 No Content response
        if (response.status() === 204) {
            return {} as T;
        }

        return await response.json();
    }

    /**
     * Query records using SOQL
     */
    async query<T>(soql: string): Promise<T[]> {
        const result = await this.restCall<{ records: T[] }>(
            'GET',
            `/query?q=${encodeURIComponent(soql)}`
        );
        return result.records;
    }

    /**
     * Create a new record
     */
    async createRecord(objectName: string, data: Record<string, unknown>): Promise<string> {
        const result = await this.restCall<{ id: string }>(
            'POST',
            `/sobjects/${objectName}`,
            data
        );
        return result.id;
    }

    /**
     * Update an existing record
     */
    async updateRecord(objectName: string, recordId: string, data: Record<string, unknown>): Promise<void> {
        await this.restCall(
            'PATCH',
            `/sobjects/${objectName}/${recordId}`,
            data
        );
    }

    /**
     * Delete a record
     */
    async deleteRecord(objectName: string, recordId: string): Promise<void> {
        await this.restCall('DELETE', `/sobjects/${objectName}/${recordId}`);
    }

    /**
     * Get record by ID
     */
    async getRecord<T>(objectName: string, recordId: string, fields?: string[]): Promise<T> {
        const fieldParam = fields ? `?fields=${fields.join(',')}` : '';
        return await this.restCall<T>(
            'GET',
            `/sobjects/${objectName}/${recordId}${fieldParam}`
        );
    }

    /**
     * Create a user (for testing purposes)
     */
    async createUser(userData: {
        firstName: string;
        lastName: string;
        email: string;
        username: string;
        profileId: string;
        alias?: string;
    }): Promise<string> {
        const userRecord: Record<string, unknown> = {
            FirstName: userData.firstName,
            LastName: userData.lastName,
            Email: userData.email,
            Username: userData.username,
            Alias: userData.alias || userData.lastName.substring(0, 8),
            TimeZoneSidKey: 'America/Los_Angeles',
            LocaleSidKey: 'en_US',
            EmailEncodingKey: 'UTF-8',
            ProfileId: userData.profileId,
            LanguageLocaleKey: 'en_US',
        };

        return await this.createRecord('User', userRecord);
    }

    /**
     * Get profile ID by name
     */
    async getProfileIdByName(profileName: string): Promise<string | null> {
        const profiles = await this.query<{ Id: string }>(
            `SELECT Id FROM Profile WHERE Name = '${profileName}' LIMIT 1`
        );
        return profiles.length > 0 ? profiles[0].Id : null;
    }

    /**
     * Assign permission set to user
     */
    async assignPermissionSet(userId: string, permissionSetName: string): Promise<void> {
        // Get permission set ID
        const permSets = await this.query<{ Id: string }>(
            `SELECT Id FROM PermissionSet WHERE Name = '${permissionSetName}' LIMIT 1`
        );

        if (permSets.length === 0) {
            throw new Error(`Permission set "${permissionSetName}" not found`);
        }

        // Create assignment
        await this.createRecord('PermissionSetAssignment', {
            AssigneeId: userId,
            PermissionSetId: permSets[0].Id,
        });
    }

    /**
     * Login as a different user using the frontdoor approach
     * Requires prior login as admin who can grant access
     */
    async loginAsUser(username: string, password: string): Promise<void> {
        // Save current credentials temporarily
        const originalUsername = config.salesforce.username;
        const originalPassword = config.salesforce.password;

        // Override config for this login
        (config.salesforce as { username: string }).username = username;
        (config.salesforce as { password: string }).password = password;

        try {
            await this.loginViaFrontdoor();
        } finally {
            // Restore original credentials
            (config.salesforce as { username: string }).username = originalUsername;
            (config.salesforce as { password: string }).password = originalPassword;
        }
    }
}

export default SalesforceApiUtils;
