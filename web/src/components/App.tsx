import React, { useState } from 'react';
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

function App() {
    const auth = useAuth();
    const [count, setCount] = useState<number>(10);
    const [subject, setSubject] = useState<string>('Test Email - Unsubscribe POC');
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<SendResult | null>(null);
    const [error, setError] = useState<string | null>(null);

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
                <Typography variant="h4" gutterBottom>
                    Email Unsubscribe POC
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

        try {
            const response = await fetch(`${Config.apiUrl}/send-emails`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.user?.access_token}`,
                },
                body: JSON.stringify({ count, subject }),
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

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Email Unsubscribe POC
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

                        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                            <TextField
                                label="Number of Emails"
                                type="number"
                                value={count}
                                onChange={(e) => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                                inputProps={{ min: 1, max: 50 }}
                                sx={{ width: 150 }}
                            />
                            <TextField
                                label="Subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                sx={{ flexGrow: 1, minWidth: 200 }}
                            />
                        </Box>

                        <Button
                            variant="contained"
                            onClick={handleSendEmails}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} /> : null}
                        >
                            {loading ? 'Sending...' : `Send ${count} Email${count !== 1 ? 's' : ''}`}
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
