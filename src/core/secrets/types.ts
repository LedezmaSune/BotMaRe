export type SecretProviderType = 'dotenv' | 'environment' | '1password';

export interface SecretProviderHealth {
    status: 'ok' | 'error' | 'warning';
    provider: SecretProviderType;
    details: {
        cliAvailable?: boolean;
        vaultName?: string;
        resolvedCount: number;
        missingCount: number;
        source: string;
        error?: string;
    };
    timestamp: string;
}

export interface SecretReferenceInfo {
    key: string;
    reference?: string;
    source: '1password' | 'env' | 'database' | 'missing';
    isSet: boolean;
}

