import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import { CircularProgress, Container, Typography } from '@mui/material';

function LoggedIn() {
    const auth = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (auth.isAuthenticated) {
            navigate('/');
        }
    }, [auth.isAuthenticated, navigate]);

    return (
        <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Completing sign in...</Typography>
        </Container>
    );
}

export default LoggedIn;
