'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
  CircularProgress,
  Box,
  IconButton,
  ListItemIcon
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';

export default function LobbiesPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const lobbiesRef = ref(db, 'lobbies');

    const unsubscribe = onValue(lobbiesRef, (snapshot) => {
      const lobbiesData = [];
      snapshot.forEach((childSnapshot) => {
        lobbiesData.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
      setLobbies(lobbiesData.reverse()); // Show newest lobbies first
      setLoading(false);
    }, (error) => {
      console.error("Firebase read error:", error);
      setError("Failed to load lobbies. Check database rules or connection.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleJoinLobby = async (lobby) => {
    if (!user) {
      setError('You must be logged in to join a lobby.');
      return;
    }

    // 1. Check if lobby is full
    const players = lobby.players || {};
    if (Object.keys(players).length >= lobby.maxPlayers) {
      alert('This lobby is full.');
      return;
    }
    
    // 2. Check if already in lobby (less likely with presence, but good for safety)
    if (players[user.uid]) {
      router.push(`/lobbies/${lobby.id}`);
      return;
    }

    // 3. Handle private lobbies
    if (!lobby.isPublic) {
      const password = prompt('This lobby is private. Please enter the password:');
      if (password === null) return; // User cancelled

      if (lobby.password !== password) {
        alert('Incorrect password.');
        return;
      }
    }

    // 4. If all checks pass, redirect to the lobby room.
    // The LobbyRoomPage will handle adding the user to the players list.
    router.push(`/lobbies/${lobby.id}`);
  };

  if (authLoading || loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container>
        <Typography variant="h5" align="center" sx={{ mt: 4 }}>
          Please log in to view and join lobbies.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Lobbies
        </Typography>
        <Link href="/lobbies/create" passHref>
          <Button variant="contained" color="primary">
            Create New Lobby
          </Button>
        </Link>
      </Box>

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      <Paper elevation={3}>
        <List>
          {lobbies.length > 0 ? (
            lobbies.map((lobby) => (
              <ListItem
                key={lobby.id}
                secondaryAction={
                  <Button
                    variant="outlined"
                    onClick={() => handleJoinLobby(lobby)}
                    disabled={(lobby.players && Object.keys(lobby.players).length >= lobby.maxPlayers) || (lobby.players && lobby.players[user.uid])}
                  >
                    {(lobby.players && lobby.players[user.uid]) ? 'Joined' : 'Join'}
                  </Button>
                }
                divider
              >
                <ListItemIcon>
                  {lobby.isPublic ? <LockOpenIcon /> : <LockIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={lobby.name}
                  secondary={`${lobby.players ? Object.keys(lobby.players).length : 0} / ${lobby.maxPlayers} players | Game: ${lobby.gameType || 'Not Selected'}`}
                />
              </ListItem>
            ))
          ) : (
            <Typography sx={{ p: 3, textAlign: 'center' }}>
              No lobbies available. Why not create one?
            </Typography>
          )}
        </List>
      </Paper>
    </Container>
  );
}
