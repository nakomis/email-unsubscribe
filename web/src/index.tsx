import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './components/App';
import { AuthProvider } from 'react-oidc-context';
import { BrowserRouter, Route, Routes } from 'react-router';
import LoggedIn from './components/LoggedIn';
import Logout from './components/Logout';
import Unsubscribe from './components/Unsubscribe';
import Config from './config/config';

const cognitoAuthConfig = {
    authority: Config.cognito.authority,
    client_id: Config.cognito.userPoolClientId,
    redirect_uri: Config.cognito.redirectUri,
    response_type: "code",
    scope: "email openid profile",
};

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                {/* Public unsubscribe route - no auth required */}
                <Route path="/unsubscribe" element={<Unsubscribe />} />

                {/* Authenticated routes */}
                <Route path="/*" element={
                    <AuthProvider {...cognitoAuthConfig}>
                        <Routes>
                            <Route path="/" element={<App />} />
                            <Route path="/loggedin" element={<LoggedIn />} />
                            <Route path="/logout" element={<Logout />} />
                        </Routes>
                    </AuthProvider>
                } />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);
