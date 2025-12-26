'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
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
  Tooltip,
  Chip,
  Paper,
  Alert,
  Avatar,
  AvatarGroup,
  Divider
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PeopleIcon from '@mui/icons-material/People';
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default function LobbiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const lobbiesRef = ref(db, 'lobbies');
    const unsubscribe = onValue(lobbiesRef, (snapshot) => {
      setLoading(true);
      const lobbiesData = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          lobbiesData.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
      }
      setLobbies(lobbiesData.reverse());
      setLoading(false);
    }, (error) => {
      console.error("Firebase read error:", error);
      setError("Failed to load lobbies in real-time. Please check your connection.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        <Typography variant="h4" gutterBottom>Welcome to the Arena!</Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Log in to challenge other players, join existing game lobbies, or create your own.
        </Typography>
        <Link href="/login" passHref>
          <Button variant="contained" color="primary" size="large">Log In to Compete</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Open Lobbies
        </Typography>
        <Link href="/lobbies/create" passHref>
          <Button variant="contained" color="primary" startIcon={<AddCircleOutlineIcon />}>
            Create New Lobby
          </Button>
        </Link>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : lobbies.length > 0 ? (
        <Grid container spacing={3}>
          {lobbies.map((lobby) => {
            const players = lobby.players || {};
            const playerCount = Object.keys(players).length;
            const isFull = playerCount >= lobby.maxPlayers;
            const isJoined = user && players[user.uid];
            const createdBy = lobby.createdBy || {};

            return (
              <Grid item xs={12} sm={6} md={4} key={lobby.id}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  borderRadius: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } 
                }}>
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography variant="h6" component="div" noWrap sx={{ fontWeight: 'bold' }}>
                          {lobby.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                           <Avatar src={createdBy.photoURL || ''} sx={{ width: 20, height: 20, fontSize: '0.7rem' }} />
                           <Typography variant="caption">
                             {createdBy.displayName || 'Anonymous'}
                           </Typography>
                        </Box>
                      </Box>
                      <Tooltip title={lobby.isPublic ? 'Public Lobby' : 'Private Lobby'}>
                        {lobby.isPublic ? <LockOpenIcon color="action" /> : <LockIcon color="disabled" />}
                      </Tooltip>
                    </Box>
                    <Chip 
                      icon={<VideogameAssetIcon />} 
                      label={lobby.gameType || 'N/A'} 
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                    <Divider sx={{ my: 1 }} />
                     <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 32, height: 32, fontSize: '0.8rem', borderWidth: 2 } }}>
                          {Object.values(players).map((p, i) => (
                            <Tooltip key={i} title={p.displayName}>
                              <Avatar alt={p.displayName} src={p.photoURL || ''} />
                            </Tooltip>
                          ))}
                        </AvatarGroup>
                        <Chip icon={<PeopleIcon />} label={`${playerCount}/${lobby.maxPlayers}`} />
                    </Box>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 1, justifyContent: 'flex-end' }}>
                    <Button
                      size="medium"
                      variant={isJoined ? "contained" : "outlined"}
                      color="primary"
                      onClick={() => handleJoinLobby(lobby)}
                      disabled={isFull && !isJoined}
                    >
                      {isJoined ? 'Enter Lobby' : 'Join'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Paper elevation={0} sx={{ p: {xs: 3, sm: 6}, textAlign: 'center', mt: 4, backgroundColor: 'action.hover' }}>
          <EmojiEventsIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>The Arena is Quiet</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            No active lobbies right now. Why not be the one to start the action?
          </Typography>
          <Link href="/lobbies/create" passHref>
            <Button variant="contained" size="large" startIcon={<AddCircleOutlineIcon />}>
              Create the First Lobby
            </Button>
          </Link>
        </Paper>
      )}
    </Container>
  );
}
