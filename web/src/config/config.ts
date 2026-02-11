import configData from './config.json';

interface CognitoConfig {
    authority: string;
    userPoolId: string;
    userPoolClientId: string;
    redirectUri: string;
    logoutUri: string;
    cognitoDomain: string;
}

interface AppConfig {
    env: string;
    region: string;
    apiUrl: string;
    cognito: CognitoConfig;
}

const Config: AppConfig = {
    env: configData.env,
    region: configData.region,
    apiUrl: configData.apiUrl,
    cognito: {
        authority: configData.authority,
        userPoolId: configData.userPoolId,
        userPoolClientId: configData.userPoolClientId,
        redirectUri: configData.redirectUri,
        logoutUri: configData.logoutUri,
        cognitoDomain: configData.cognitoDomain,
    },
};

export default Config;
