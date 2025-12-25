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
  Chip,
  Avatar,
  ListItemAvatar,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Divider,
  Tooltip
} from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import PersonIcon from '@mui/icons-material/Person';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import CrownIcon from '@mui/icons-material/EmojiEvents'; // Crown icon for owner

export default function LobbyRoomPage({ lobbyId }) {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lobby, setLobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const presenceUnsubscribe = useRef(null);
  const didJoin = useRef(false);

  // Main listener for lobby data
  useEffect(() => {
    if (!lobbyId) return;
    const lobbyRef = ref(db, `lobbies/${lobbyId}`);
    const unsubscribe = onValue(lobbyRef, (snapshot) => {
      if (snapshot.exists()) {
        setLobby({ id: snapshot.key, ...snapshot.val() });
      } else {
        setError('This lobby no longer exists. You will be redirected.');
        setLobby(null);
        setTimeout(() => router.push('/lobbies'), 3000);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to load lobby data.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [lobbyId, router]);

  // Presence system to join/leave lobby
  useEffect(() => {
    if (!lobbyId || !user || !profile) return;

    const lobbyRef = ref(db, `lobbies/${lobbyId}`);
    const playerRef = ref(db, `lobbies/${lobbyId}/players/${user.uid}`);

    get(lobbyRef).then((snapshot) => {
      if (!snapshot.exists()) return;

      const lobbyData = snapshot.val();
      const players = lobbyData.players || {};

      if (Object.keys(players).length >= lobbyData.maxPlayers && !players[user.uid]) {
        alert("Cannot join lobby, it is now full.");
        router.push('/lobbies');
        return;
      }

      didJoin.current = true;
      const presenceRef = ref(db, '.info/connected');
      
      presenceUnsubscribe.current = onValue(presenceRef, (snap) => {
        if (snap.val() === true) {
          onDisconnect(playerRef).remove();
          const displayName = profile.displayName || user.displayName || 'Anonymous';
          set(playerRef, {
            displayName: displayName,
            photoURL: profile.photoURL || user.photoURL || '', // Store photoURL
            joinedAt: Date.now()
          });
        }
      });
    });

    return () => {
      if (presenceUnsubscribe.current) presenceUnsubscribe.current();
      if (didJoin.current) {
        const lobbyRef = ref(db, `lobbies/${lobbyId}`);
        runTransaction(lobbyRef, (currentData) => {
          if (!currentData) return null;
          const isOwner = user.uid === currentData.ownerId;
          if (isOwner) return null;
          if (Object.keys(currentData.players || {}).length <= 1) return null;
          if (currentData.players && currentData.players[user.uid]) {
            delete currentData.players[user.uid];
          }
          return currentData;
        });
      }
    };
  }, [lobbyId, user, profile, router]);

  const handleLeaveLobby = () => router.push('/lobbies');

  const handleDeleteLobby = async () => {
    if (!user || !lobby || user.uid !== lobby.ownerId) return;
    await remove(ref(db, `lobbies/${lobby.id}`));
    router.push('/lobbies');
  };

  const handleStartGame = async () => {
    if (!user || !lobby || user.uid !== lobby.ownerId || lobby.status !== 'waiting') return;
    if (Object.keys(lobby.players || {}).length < lobby.maxPlayers) {
      setError(`Need ${lobby.maxPlayers} players to start the game.`);
      return;
    }

    try {
      const newGameRef = push(ref(db, 'games'));
      const gameId = newGameRef.key;
      let initialGameState = {};
      const playersData = Object.fromEntries(
        Object.entries(lobby.players).map(([uid, player]) => [uid, { ...player, uid }])
      );

      if (lobby.gameType === 'Tic-Tac-Toe') {
        initialGameState = {
          board: Array(9).fill(null),
          players: playersData,
          currentPlayer: Object.keys(lobby.players)[0],
          status: 'playing',
          winner: null,
          moves: 0,
        };
      } else if (lobby.gameType === 'Rock, Paper, Scissors') {
        initialGameState = {
          players: playersData,
          scores: Object.keys(playersData).reduce((acc, uid) => ({ ...acc, [uid]: 0 }), {}),
          moves: Object.keys(playersData).reduce((acc, uid) => ({ ...acc, [uid]: null }), {}),
          roundWinner: null,
          status: 'playing',
        };
      }

      await set(newGameRef, {
        lobbyId: lobby.id,
        gameType: lobby.gameType,
        createdAt: Date.now(),
        ...initialGameState,
      });

      await runTransaction(ref(db, `lobbies/${lobby.id}`), (lobbyData) => {
        if (lobbyData) {
          lobbyData.gameId = gameId;
          lobbyData.status = 'playing';
        }
        return lobbyData;
      });
      
      // The gameId update on the lobby will trigger a redirect for all players
    } catch (e) {
      console.error('Failed to start game:', e);
      setError('An error occurred while trying to start the game.');
    }
  };
  
  // Redirect to game if gameId appears on lobby
  useEffect(() => {
    if (lobby?.gameId) {
      router.push(`/games/${lobby.gameId}`);
    }
  }, [lobby, router]);

  if (authLoading || loading) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Container>;
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => router.push('/lobbies')}>
            Back to Lobbies
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!lobby) return null;

  const isOwner = user && user.uid === lobby.ownerId;
  const players = lobby.players ? Object.entries(lobby.players) : [];
  const playerProgress = (players.length / lobby.maxPlayers) * 100;

  const getGameIcon = (gameType) => {
    switch (gameType) {
      case 'Tic-Tac-Toe': return <GridOnIcon />;
      case 'Rock, Paper, Scissors': return <SportsKabaddiIcon />;
      default: return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={4} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item>
              <Typography variant="h4" component="h1">{lobby.name}</Typography>
              <Box display="flex" alignItems="center" mt={1}>
                {getGameIcon(lobby.gameType)}
                <Typography variant="h6" sx={{ ml: 1 }}>{lobby.gameType}</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Chip label={lobby.isPublic ? 'Public' : 'Private'} color="secondary" />
            </Grid>
          </Grid>
        </Box>
        
        <Grid container>
          <Grid item xs={12} md={7} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Waiting Room</Typography>
            <Box sx={{ textAlign: 'center', p: 4, border: '2px dashed', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="h6">
                Waiting for players...
              </Typography>
              <Typography color="text.secondary">
                The game will begin once the lobby is full and the owner starts it.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress variant="determinate" value={playerProgress} />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">{`${players.length}/${lobby.maxPlayers}`}</Typography>
                </Box>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={5} sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Players</Typography>
                <List dense>
                  {players.map(([uid, player]) => (
                    <ListItem key={uid} secondaryAction={
                      uid === lobby.ownerId ? <Tooltip title="Lobby Owner"><CrownIcon color="warning" /></Tooltip> : null
                    }>
                      <ListItemAvatar>
                        <Avatar src={player.photoURL}>
                          {!player.photoURL && <PersonIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={player.displayName} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
              <Divider />
              <Box sx={{ p: 2 }}>
                {isOwner && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PlayCircleFilledIcon />}
                    onClick={handleStartGame}
                    fullWidth
                    disabled={players.length < lobby.maxPlayers}
                  >
                    Start Game
                  </Button>
                )}
                <Button variant="outlined" color="warning" startIcon={<ExitToAppIcon />} onClick={handleLeaveLobby} fullWidth sx={{ mt: 1 }}>
                  Leave Lobby
                </Button>
                {isOwner && (
                  <Button variant="text" color="error" startIcon={<DeleteForeverIcon />} onClick={handleDeleteLobby} fullWidth sx={{ mt: 1 }}>
                    Delete Lobby
                  </Button>
                )}
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
