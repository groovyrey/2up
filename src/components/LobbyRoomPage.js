'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { ref, onValue, remove, set, onDisconnect, get, runTransaction, push } from 'firebase/database';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Paper,
  CircularProgress,
  Box,
  List,
  ListItem,
  ListItemText,
  Button,
  Grid,
  Chip
} from '@mui/material';
import CrownIcon from '@mui/icons-material/EmojiEvents';

export default function LobbyRoomPage({ lobbyId }) {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lobby, setLobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const presenceUnsubscribe = useRef(null);
  const didJoin = useRef(false);

  // Listener for lobby data for UI rendering
  useEffect(() => {
    if (!lobbyId) return;
    const lobbyRef = ref(db, `lobbies/${lobbyId}`);
    const unsubscribe = onValue(lobbyRef, (snapshot) => {
      if (snapshot.exists()) {
        setLobby({ id: snapshot.key, ...snapshot.val() });
      } else {
        setError('This lobby no longer exists.');
        setLobby(null);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to load lobby data.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [lobbyId]);

  // Presence system
  useEffect(() => {
    if (!lobbyId || !user || !profile) {
      return;
    }

    const lobbyRef = ref(db, `lobbies/${lobbyId}`);
    const playerRef = ref(db, `lobbies/${lobbyId}/players/${user.uid}`);

    get(lobbyRef).then((snapshot) => {
      if (!snapshot.exists()) {
        // This case is handled by the main listener, but good to have a safeguard.
        return;
      }

      const lobbyData = snapshot.val();
      const players = lobbyData.players || {};

      if (Object.keys(players).length >= lobbyData.maxPlayers && !players[user.uid]) {
        alert("Cannot join lobby, it is now full.");
        router.push('/lobbies');
        return;
      }

      // If check passes, mark as joined and set up presence
      didJoin.current = true;
      const presenceRef = ref(db, '.info/connected');
      
      presenceUnsubscribe.current = onValue(presenceRef, (snap) => {
        if (snap.val() === true) {
          onDisconnect(playerRef).remove();
          const displayName = profile.displayName || user.displayName || 'Anonymous';
          set(playerRef, {
            displayName: displayName,
            joinedAt: Date.now()
          });
        }
      });
    });

    return () => {
      if (presenceUnsubscribe.current) {
        presenceUnsubscribe.current();
      }
      if (didJoin.current) {
        const lobbyRef = ref(db, `lobbies/${lobbyId}`);
        // Use a transaction to safely update/delete the lobby on graceful leave
        runTransaction(lobbyRef, (currentData) => {
          if (currentData === null) {
            return null; // Lobby already deleted
          }

          const players = currentData.players || {};
          const numPlayers = Object.keys(players).length;
          const isOwner = user.uid === currentData.ownerId;

          // Condition 1: If the owner is leaving, delete the whole lobby.
          if (isOwner) {
            return null; // Returning null deletes the data at the reference.
          }

          // Condition 2: If this is the last player leaving, delete the lobby.
          if (numPlayers <= 1 && players[user.uid]) {
            return null;
          }

          // Otherwise, just remove the current player.
          if (players[user.uid]) {
            delete currentData.players[user.uid];
          }
          return currentData;
        });
      }
    };
  }, [lobbyId, user, profile, router]);


  const handleLeaveLobby = () => {
    // The useEffect cleanup will handle the database removal.
    // We just need to navigate away.
    router.push('/lobbies');
  };

  const handleDeleteLobby = async () => {
    if (!user || !lobby || user.uid !== lobby.ownerId) return;
    const lobbyRef = ref(db, `lobbies/${lobby.id}`);
    try {
      await remove(lobbyRef);
      router.push('/lobbies');
    } catch (err) {
      console.error('Failed to delete lobby:', err);
      alert('An error occurred while trying to delete the lobby.');
    }
  };

  const handleStartGame = async () => {
    if (!user || !lobby || user.uid !== lobby.ownerId) {
      alert('Only the lobby owner can start the game.');
      return;
    }

    if (lobby.status !== 'waiting') {
      alert('Game has already started or finished.');
      return;
    }

    if (Object.keys(lobby.players || {}).length < lobby.maxPlayers) {
      alert(`Need ${lobby.maxPlayers} players to start the game.`);
      return;
    }

    try {
      // For now, we will just remove the lobby as game system is being removed.
      const lobbyRef = ref(db, `lobbies/${lobby.id}`);
      await remove(lobbyRef);
      router.push('/lobbies');

    } catch (e) {
      console.error('Failed to start game:', e);
      alert('An error occurred while trying to start the game.');
    }
  };

  if (authLoading || loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography variant="h5" align="center" color="error" sx={{ mt: 4 }}>
          {error}
        </Typography>
        <Box textAlign="center" mt={2}>
          <Button variant="contained" onClick={() => router.push('/lobbies')}>
            Back to Lobbies
          </Button>
        </Box>
      </Container>
    );
  }

  if (!lobby) {
    return null; // Should be handled by the error state
  }
  
  const isOwner = user && user.uid === lobby.ownerId;
  const players = lobby.players ? Object.entries(lobby.players) : [];

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h4" gutterBottom>
              {lobby.game}
            </Typography>
            <Box>
              {lobby.status === 'waiting' && (
                <Typography variant="h6" align="center" sx={{ mt: 4 }}>
                  Waiting for players to join and owner to start the game...
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" gutterBottom>
                {lobby.name}
              </Typography>
              <Chip label={lobby.isPublic ? 'Public' : 'Private'} />
            </Box>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Players ({players.length} / {lobby.maxPlayers})
            </Typography>
            <List>
              {players.map(([uid, player]) => (
                <ListItem key={uid} divider>
                  <ListItemText primary={player.displayName} />
                  {uid === lobby.ownerId && <CrownIcon color="warning" />}
                </ListItem>
              ))}
            </List>
            <Box sx={{ mt: 3 }}>
              <Button variant="outlined" color="error" onClick={handleLeaveLobby} fullWidth>
                Leave Lobby
              </Button>
              {isOwner && lobby.status === 'waiting' && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleStartGame}
                  fullWidth
                  sx={{ mt: 1 }}
                  disabled={Object.keys(lobby.players || {}).length < lobby.maxPlayers}
                >
                  Start Game
                </Button>
              )}
              {isOwner && (
                <Button variant="contained" color="error" onClick={handleDeleteLobby} fullWidth sx={{ mt: 1 }}>
                  Delete Lobby
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
