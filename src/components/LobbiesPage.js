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
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton
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
        <Box sx={{ mt: 3 }}> {/* Added Box wrapper here */}
          <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
            {lobbies.map((lobby, index) => {
              const players = lobby.players || {};
              const playerCount = Object.keys(players).length;
              const isFull = playerCount >= lobby.maxPlayers;
              const isJoined = user && players[user.uid];
              const createdBy = lobby.createdBy || {};

              return (
                <React.Fragment key={lobby.id}>
                  <ListItem
                    alignItems="flex-start"
                    secondaryAction={
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <Tooltip title={lobby.isPublic ? 'Public Lobby' : 'Private Lobby'}>
                          {lobby.isPublic ? <LockOpenIcon color="action" /> : <LockIcon color="disabled" />}
                        </Tooltip>
                        <Button
                          size="small"
                          variant={isJoined ? "contained" : "outlined"}
                          color="primary"
                          onClick={() => handleJoinLobby(lobby)}
                          disabled={isFull && !isJoined}
                          sx={{ mt: 1 }}
                        >
                          {isJoined ? 'Enter' : 'Join'}
                        </Button>
                      </Box>
                    }
                    sx={{
                      py: 2,
                      px: 3,
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar sx={{ mr: 2 }}>
                      <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 32, height: 32, fontSize: '0.8rem' } }}>
                        {Object.values(players).map((p, i) => (
                          <Tooltip key={i} title={p.displayName}>
                            <Avatar alt={p.displayName} src={p.photoURL || ''} />
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    </ListItemAvatar>
                    <ListItemText
                      component="div"
                      primary={
                        <Typography
                          component="div"
                          variant="h6"
                          sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          {lobby.name}
                          <Chip
                            icon={<VideogameAssetIcon />}
                            label={lobby.gameType || 'N/A'}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        </Typography>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography
                            sx={{ display: 'block' }}
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            Created by: {createdBy.displayName || 'Anonymous'}
                          </Typography>
                          <Typography
                            sx={{ display: 'block' }}
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            Players: {playerCount}/{lobby.maxPlayers}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {index < lobbies.length - 1 && <Divider component="li" />}
                </React.Fragment>
              );
            })}
          </List>
        </Box>
      ) : (
        <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          No lobbies found. Be the first to create one!
        </Typography>
      )}
    </Container>
  );
}
