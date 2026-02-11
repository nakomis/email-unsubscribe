import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import {
    Container,
    Typography,
    Button,
    Card,
    CardContent,
    Alert,
    CircularProgress,
    Box,
} from '@mui/material';
import Config from '../config/config';

interface UnsubscribeStatus {
    email: string;
    alreadyUnsubscribed: boolean;
}

function Unsubscribe() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState<boolean>(true);
    const [processing, setProcessing] = useState<boolean>(false);
    const [status, setStatus] = useState<UnsubscribeStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);

    useEffect(() => {
        if (!token) {
            setError('Missing unsubscribe token');
            setLoading(false);
            return;
        }

        const fetchStatus = async () => {
            try {
                const response = await fetch(`${Config.apiUrl}/unsubscribe?token=${token}`);
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to validate token');
                }
                const data = await response.json();
                setStatus(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, [token]);

    const handleUnsubscribe = async () => {
        if (!token) return;

        setProcessing(true);
        setError(null);

        try {
            const response = await fetch(`${Config.apiUrl}/unsubscribe?token=${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'action=unsubscribe',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to unsubscribe');
            }

            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setProcessing(false);
        }
    };

    const maskEmail = (email: string): string => {
        const [local, domain] = email.split('@');
        if (local.length <= 2) {
            return `${local[0]}***@${domain}`;
        }
        return `${local[0]}***${local[local.length - 1]}@${domain}`;
    };

    if (loading) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Loading...</Typography>
            </Container>
        );
    }

    if (error && !status) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8 }}>
                <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" gutterBottom color="error">
                            Invalid Link
                        </Typography>
                        <Alert severity="error">{error}</Alert>
                    </CardContent>
                </Card>
            </Container>
        );
    }

    if (success || status?.alreadyUnsubscribed) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8 }}>
                <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" gutterBottom sx={{ color: 'success.main' }}>
                            ✓
                        </Typography>
                        <Typography variant="h5" gutterBottom>
                            {status?.alreadyUnsubscribed ? 'Already Unsubscribed' : "You've been unsubscribed"}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {status?.email && maskEmail(status.email)} will no longer receive these emails.
                        </Typography>
                    </CardContent>
                </Card>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" gutterBottom>
                        Unsubscribe
                    </Typography>

                    <Typography variant="body1" sx={{ mb: 1 }}>
                        Email: <strong>{status?.email && maskEmail(status.email)}</strong>
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        You'll stop receiving test emails from the Unsubscribe POC.
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleUnsubscribe}
                            disabled={processing}
                            startIcon={processing ? <CircularProgress size={20} /> : null}
                        >
                            {processing ? 'Processing...' : 'Unsubscribe'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
}

export default Unsubscribe;
