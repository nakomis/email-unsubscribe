import React, { useState, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import {
    Container,
    Typography,
    Button,
    TextField,
    Card,
    CardContent,
    Alert,
    CircularProgress,
    Box,
    List,
    ListItem,
    ListItemText,
    AppBar,
    Toolbar,
} from '@mui/material';
import Config from '../config/config';

interface SendResult {
    success: boolean;
    sentCount: number;
    emails: string[];
    errors: string[];
}

const COOKIE_NAME = 'additionalEmails';

function getCookie(name: string): string {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return decodeURIComponent(parts.pop()?.split(';').shift() || '');
    }
    return '';
}

function setCookie(name: string, value: string, days: number = 365): void {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function App() {
    const auth = useAuth();
    const [count, setCount] = useState<number>(10);
    const [subject, setSubject] = useState<string>('Test Email - Unsubscribe POC');
    const [additionalEmails, setAdditionalEmails] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<SendResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load additional emails from cookie on mount
    useEffect(() => {
        const saved = getCookie(COOKIE_NAME);
        if (saved) {
            setAdditionalEmails(saved);
        }
    }, []);

    // Save additional emails to cookie when changed
    const handleAdditionalEmailsChange = (value: string) => {
        setAdditionalEmails(value);
        setCookie(COOKIE_NAME, value);
    };

    if (auth.isLoading) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Loading...</Typography>
            </Container>
        );
    }

    if (!auth.isAuthenticated) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
                <Box sx={{ mb: 3 }}>
                    <img src="/wolf.png" alt="Logo" style={{ width: 80, height: 80 }} />
                </Box>
                <Typography variant="h4" gutterBottom>
                    Nakomis Email Unsubscriber
                </Typography>
                <Typography variant="body1" sx={{ mb: 4 }}>
                    Please sign in to send test emails.
                </Typography>
                <Button
                    variant="contained"
                    size="large"
                    onClick={() => auth.signinRedirect()}
                >
                    Sign In
                </Button>
            </Container>
        );
    }

    const handleSendEmails = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        // Parse additional emails
        const extraEmails = additionalEmails
            .split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0 && e.includes('@'));

        try {
            const response = await fetch(`${Config.apiUrl}/send-emails`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.user?.access_token}`,
                },
                body: JSON.stringify({
                    count,
                    subject,
                    additionalEmails: extraEmails,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data: SendResult = await response.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const totalEmails = count + additionalEmails.split(',').filter(e => e.trim().includes('@')).length;

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <img src="/wolf.png" alt="Logo" style={{ width: 32, height: 32, marginRight: 12 }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Nakomis Email Unsubscriber
                    </Typography>
                    <Typography variant="body2" sx={{ mr: 2 }}>
                        {auth.user?.profile?.email || auth.user?.profile?.preferred_username}
                    </Typography>
                    <Button color="inherit" onClick={() => auth.signoutRedirect()}>
                        Sign Out
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h5" gutterBottom>
                            Send Test Emails
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                            <TextField
                                label="Number of Auto-Generated Emails"
                                type="number"
                                value={count}
                                onChange={(e) => setCount(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                                inputProps={{ min: 0, max: 50 }}
                                sx={{ width: 220 }}
                            />
                            <TextField
                                label="Subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                sx={{ flexGrow: 1, minWidth: 200 }}
                            />
                        </Box>

                        <TextField
                            label="Additional Email Addresses (comma-separated)"
                            value={additionalEmails}
                            onChange={(e) => handleAdditionalEmailsChange(e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="email1@example.com, email2@example.com"
                            helperText="These addresses will be saved for next time"
                            sx={{ mb: 3 }}
                        />

                        <Button
                            variant="contained"
                            onClick={handleSendEmails}
                            disabled={loading || totalEmails === 0}
                            startIcon={loading ? <CircularProgress size={20} /> : null}
                        >
                            {loading ? 'Sending...' : `Send ${totalEmails} Email${totalEmails !== 1 ? 's' : ''}`}
                        </Button>
                    </CardContent>
                </Card>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {result && (
                    <Card>
                        <CardContent>
                            <Alert severity={result.success ? 'success' : 'warning'} sx={{ mb: 2 }}>
                                Sent {result.sentCount} email{result.sentCount !== 1 ? 's' : ''}
                                {result.errors.length > 0 && ` (${result.errors.length} failed)`}
                            </Alert>

                            <Typography variant="h6" gutterBottom>
                                Sent To:
                            </Typography>
                            <List dense>
                                {result.emails.map((email, index) => (
                                    <ListItem key={index}>
                                        <ListItemText primary={email} />
                                    </ListItem>
                                ))}
                            </List>

                            {result.errors.length > 0 && (
                                <>
                                    <Typography variant="h6" gutterBottom sx={{ mt: 2, color: 'error.main' }}>
                                        Errors:
                                    </Typography>
                                    <List dense>
                                        {result.errors.map((err, index) => (
                                            <ListItem key={index}>
                                                <ListItemText primary={err} sx={{ color: 'error.main' }} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </Container>
        </>
    );
}

export default App;
