'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Box,
  IconButton,
  Tooltip,
  Chip,
  Paper,
  Alert,
  Avatar,
  AvatarGroup
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PeopleIcon from '@mui/icons-material/People';
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

export default function LobbiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLobbies = useCallback(() => {
    setLoading(true);
    const lobbiesRef = ref(db, 'lobbies');
    get(lobbiesRef).then((snapshot) => {
      const lobbiesData = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          lobbiesData.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
      }
      setLobbies(lobbiesData.reverse());
    }).catch((error) => {
      console.error("Firebase read error:", error);
      setError("Failed to load lobbies. Check database rules or connection.");
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchLobbies();
    const lobbiesRef = ref(db, 'lobbies');
    const unsubscribe = onValue(lobbiesRef, (snapshot) => {
      const lobbiesData = [];
      snapshot.forEach((childSnapshot) => {
        lobbiesData.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
      setLobbies(lobbiesData.reverse());
    }, (error) => {
      console.error("Firebase read error:", error);
      setError("Failed to load lobbies in real-time. Please refresh.");
    });

    return () => unsubscribe();
  }, [fetchLobbies]);

  const handleJoinLobby = async (lobby) => {
    if (!user) {
      setError('You must be logged in to join a lobby.');
      return;
    }

    const players = lobby.players || {};
    if (Object.keys(players).length >= lobby.maxPlayers && !players[user.uid]) {
      setError('This lobby is full.');
      return;
    }
    
    if (players[user.uid]) {
      router.push(`/lobbies/${lobby.id}`);
      return;
    }

    if (!lobby.isPublic) {
      const password = prompt('This lobby is private. Please enter the password:');
      if (password === null) return; 

      if (lobby.password !== password) {
        setError('Incorrect password.');
        return;
      }
    }

    router.push(`/lobbies/${lobby.id}`);
  };

  if (authLoading) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Container>;
  }

  if (!user) {
    return (
      <Container component={Paper} elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Welcome!</Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Please log in to view available game lobbies or create your own.
        </Typography>
        <Link href="/login" passHref>
          <Button variant="contained" color="primary">Log In</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Game Lobbies
        </Typography>
        <Box>
          <Tooltip title="Refresh Lobbies">
            <IconButton onClick={fetchLobbies} color="primary" disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Link href="/lobbies/create" passHref>
            <Button variant="contained" color="primary" startIcon={<AddCircleOutlineIcon />}>
              Create Lobby
            </Button>
          </Link>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : lobbies.length > 0 ? (
        <Grid container spacing={2}>
          {lobbies.map((lobby) => {
            const players = lobby.players || {};
            const playerCount = Object.keys(players).length;
            const isFull = playerCount >= lobby.maxPlayers;
            const isJoined = user && players[user.uid];

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={lobby.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderWidth: 1, '&:hover': { boxShadow: 3 } }}>
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" component="div" noWrap>
                        {lobby.name}
                      </Typography>
                      <Tooltip title={lobby.isPublic ? 'Public' : 'Private'}>
                        {lobby.isPublic ? <LockOpenIcon fontSize="small" color="action" /> : <LockIcon fontSize="small" color="disabled" />}
                      </Tooltip>
                    </Box>
                    <Chip 
                      icon={<VideogameAssetIcon />} 
                      label={lobby.gameType || 'N/A'} 
                      size="small"
                      variant="outlined"
                    />
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.8rem' } }}>
                        {Object.values(players).map((p, i) => (
                          <Avatar key={i} alt={p.displayName} src={p.photoURL || ''} />
                        ))}
                      </AvatarGroup>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        {playerCount}/{lobby.maxPlayers}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant={isJoined ? "contained" : "outlined"}
                      onClick={() => handleJoinLobby(lobby)}
                      disabled={isFull && !isJoined}
                    >
                      {isJoined ? 'Enter' : 'Join'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Paper elevation={2} sx={{ p: 6, textAlign: 'center', mt: 4 }}>
          <Typography variant="h5" gutterBottom>No Lobbies Found</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Be the first to start a new game!
          </Typography>
          <Link href="/lobbies/create" passHref>
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />}>
              Create a New Lobby
            </Button>
          </Link>
        </Paper>
      )}
    </Container>
  );
}
