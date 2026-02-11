import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { Container, Typography, CircularProgress } from '@mui/material';

function Logout() {
    const auth = useAuth();

    useEffect(() => {
        if (auth.isAuthenticated) {
            auth.removeUser();
        }
    }, [auth]);

    return (
        <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Signing out...</Typography>
        </Container>
    );
}

export default Logout;
