import { Page } from '@playwright/test';
import { config } from '../../config/environment';
import { SalesforceUtils } from './salesforce-utils';
import { execSync } from 'child_process';

export class SalesforceApiUtils {
    private accessToken = '';
    private instanceUrl = '';
    private sfUtils: SalesforceUtils;

    constructor(private page: Page) {
        this.sfUtils = new SalesforceUtils(page);
    }

    async authenticate(): Promise<{ accessToken: string; instanceUrl: string }> {
        const result = execSync('sf org display --json', {
            encoding: 'utf-8',
            cwd: process.cwd(),
            env: { ...process.env, SF_SKIP_UPDATE_CHECK: 'true', FORCE_COLOR: '0' },
        });

        const cleanResult = result.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
        const jsonStart = cleanResult.indexOf('{');
        if (jsonStart === -1) {
            throw new Error('No JSON found in SF CLI output');
        }

        const orgInfo = JSON.parse(cleanResult.substring(jsonStart));
        if (!orgInfo.result?.accessToken) {
            throw new Error('No access token in SF CLI response');
        }

        this.accessToken = orgInfo.result.accessToken;
        this.instanceUrl = orgInfo.result.instanceUrl || config.salesforce.instanceUrl;
        console.log(`Authenticated via SF CLI. Instance: ${this.instanceUrl}`);

        return { accessToken: this.accessToken, instanceUrl: this.instanceUrl };
    }

    async loginViaFrontdoor(): Promise<void> {
        const { accessToken, instanceUrl } = await this.authenticate();
        await this.page.goto(`${instanceUrl}/secur/frontdoor.jsp?sid=${accessToken}`);
        await this.sfUtils.waitForPageLoad();
    }

    async restCall<T>(
        method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
        endpoint: string,
        data?: Record<string, unknown>
    ): Promise<T> {
        if (!this.accessToken) await this.authenticate();

        const url = `${this.instanceUrl}/services/data/v${config.salesforce.apiVersion}${endpoint}`;
        const response = await this.page.request.fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            data,
        });

        if (!response.ok()) {
            throw new Error(`Salesforce API error: ${response.status()} - ${await response.text()}`);
        }

        return response.status() === 204 ? ({} as T) : response.json();
    }

    async query<T>(soql: string): Promise<T[]> {
        const result = await this.restCall<{ records: T[] }>('GET', `/query?q=${encodeURIComponent(soql)}`);
        return result.records;
    }

    async createRecord(objectName: string, data: Record<string, unknown>): Promise<string> {
        const result = await this.restCall<{ id: string }>('POST', `/sobjects/${objectName}`, data);
        return result.id;
    }

    async updateRecord(objectName: string, recordId: string, data: Record<string, unknown>): Promise<void> {
        await this.restCall('PATCH', `/sobjects/${objectName}/${recordId}`, data);
    }

    async deleteRecord(objectName: string, recordId: string): Promise<void> {
        await this.restCall('DELETE', `/sobjects/${objectName}/${recordId}`);
    }

    async getRecord<T>(objectName: string, recordId: string, fields?: string[]): Promise<T> {
        const fieldParam = fields ? `?fields=${fields.join(',')}` : '';
        return this.restCall<T>('GET', `/sobjects/${objectName}/${recordId}${fieldParam}`);
    }

    async createUser(userData: {
        firstName: string;
        lastName: string;
        email: string;
        username: string;
        profileId: string;
        alias?: string;
    }): Promise<string> {
        return this.createRecord('User', {
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
        });
    }

    async getProfileIdByName(profileName: string): Promise<string | null> {
        const profiles = await this.query<{ Id: string }>(`SELECT Id FROM Profile WHERE Name = '${profileName}' LIMIT 1`);
        return profiles[0]?.Id ?? null;
    }

    async assignPermissionSet(userId: string, permissionSetName: string): Promise<void> {
        const permSets = await this.query<{ Id: string }>(`SELECT Id FROM PermissionSet WHERE Name = '${permissionSetName}' LIMIT 1`);
        if (!permSets.length) throw new Error(`Permission set "${permissionSetName}" not found`);
        await this.createRecord('PermissionSetAssignment', { AssigneeId: userId, PermissionSetId: permSets[0].Id });
    }
}

export default SalesforceApiUtils;
