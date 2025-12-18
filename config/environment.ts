export interface SalesforceConfig {
    instanceUrl: string;
    apiVersion: string;
}

export interface EnvironmentConfig {
    salesforce: SalesforceConfig;
    timeouts: {
        navigation: number;
        action: number;
        assertion: number;
        spinnerWait: number;
        test: number;
    };
    retries: {
        flaky: number;
        failed: number;
    };
}

export const config: EnvironmentConfig = {
    salesforce: {
        instanceUrl: process.env.SF_INSTANCE_URL || 'https://saas-velocity-3251-dev-ed.scratch.my.salesforce.com',
        apiVersion: process.env.SF_API_VERSION || '60.0',
    },
    timeouts: {
        navigation: 60000,
        action: 30000,
        assertion: 15000,
        spinnerWait: 60000,
        test: 300000,
    },
    retries: {
        flaky: 2,
        failed: 1,
    },
};

export default config;
