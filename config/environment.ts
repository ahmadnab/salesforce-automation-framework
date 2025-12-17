/**
 * Environment configuration for Salesforce Automation Framework
 * Supports multiple orgs and environments through environment variables
 */

export interface SalesforceConfig {
    instanceUrl: string;
    username: string;
    password: string;
    apiVersion: string;
    isSandbox: boolean;
}

export interface EnvironmentConfig {
    salesforce: SalesforceConfig;
    timeouts: {
        navigation: number;
        action: number;
        assertion: number;
        spinnerWait: number;
    };
    retries: {
        flaky: number;
        failed: number;
    };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value;
};

export const config: EnvironmentConfig = {
    salesforce: {
        instanceUrl: getEnvVar('SF_INSTANCE_URL', 'https://saas-velocity-3251-dev-ed.scratch.my.salesforce.com'),
        username: getEnvVar('SF_USERNAME', 'nabeelahmad@yopmail.com'),
        password: getEnvVar('SF_PASSWORD', 'Test@12345'),
        apiVersion: getEnvVar('SF_API_VERSION', '60.0'),
        isSandbox: getEnvVar('SF_IS_SANDBOX', 'false') === 'true',
    },
    timeouts: {
        navigation: 60000,
        action: 30000,
        assertion: 15000,
        spinnerWait: 60000,
    },
    retries: {
        flaky: 2,
        failed: 1,
    },
};

export default config;
