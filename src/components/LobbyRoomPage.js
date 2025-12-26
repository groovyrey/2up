'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { ref, onValue, remove, set, onDisconnect, get, runTransaction, push, serverTimestamp } from 'firebase/database';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Paper,
  CircularProgress,
  Box,
  Button,
  Grid,
  Chip,
  Avatar,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Divider,
  Tooltip,
  IconButton,
  TextField,
  ListItemAvatar,
  ListItemText,
  List,
  ListItem
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import GridOnIcon from '@mui/icons-material/GridOn';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import CrownIcon from '@mui/icons-material/EmojiEvents';
import GroupIcon from '@mui/icons-material/Group';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const EmptyPlayerSlot = styled(Paper)(({ theme }) => ({
  height: '100%',
  minHeight: 80,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  textAlign: 'center',
  border: `2px dashed ${theme.palette.divider}`,
  background: `linear-gradient(110deg, ${theme.palette.action.hover} 40%, ${theme.palette.background.paper} 50%, ${theme.palette.action.hover} 60%)`,
  backgroundSize: '200% 100%',
  animation: `${shimmer} 3s linear infinite`,
}));

export default function LobbyRoomPage({ lobbyId }) {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lobby, setLobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const presenceUnsubscribe = useRef(null);
  const didJoin = useRef(false);

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
          set(playerRef, {
            displayName: profile.displayName || user.displayName || 'Anonymous',
            photoURL: profile.photoURL || user.photoURL || '',
            joinedAt: serverTimestamp()
          });
        }
      });
    });

    return () => {
      if (presenceUnsubscribe.current) presenceUnsubscribe.current();
      if (didJoin.current) {
        remove(ref(db, `lobbies/${lobbyId}/players/${user.uid}`));
      }
    };
  }, [lobbyId, user, profile, router]);

  const handleLeaveLobby = () => router.push('/lobbies');

  const handleDeleteLobby = async () => {
    if (!user || !lobby || user.uid !== lobby.createdBy.uid) return;
    await remove(ref(db, `lobbies/${lobby.id}`));
  };

  const handleStartGame = async () => {
    if (!user || !lobby || user.uid !== lobby.createdBy.uid || lobby.status !== 'waiting') return;
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
        initialGameState = { board: Array(9).fill(''), players: playersData, currentPlayer: Object.keys(lobby.players)[0], status: 'playing', winner: null, moves: 0 };
      } else if (lobby.gameType === 'Rock, Paper, Scissors') {
        initialGameState = { players: playersData, scores: Object.keys(playersData).reduce((acc, uid) => ({ ...acc, [uid]: 0 }), {}), moves: Object.keys(playersData).reduce((acc, uid) => ({ ...acc, [uid]: null }), {}), roundWinner: null, status: 'playing' };
      } else if (lobby.gameType === 'Connect Four') {
        initialGameState = { board: Array(6).fill(Array(7).fill(null)), players: playersData, currentPlayer: Object.keys(lobby.players)[0], status: 'playing', winner: null };
      }

      await set(newGameRef, { lobbyId: lobby.id, gameType: lobby.gameType, createdAt: serverTimestamp(), ...initialGameState });
      await runTransaction(ref(db, `lobbies/${lobby.id}`), (lobbyData) => {
        if (lobbyData) {
          lobbyData.gameId = gameId;
          lobbyData.status = 'playing';
        }
        return lobbyData;
      });
      // Delete the lobby after the game has successfully started
      await remove(ref(db, `lobbies/${lobby.id}`));
    } catch (e) {
      console.error('Failed to start game:', e);
      setError('An error occurred while trying to start the game.');
    }
  };
  
  useEffect(() => {
    if (lobby?.gameId) router.push(`/games/${lobby.gameId}`);
  }, [lobby, router]);

  const copyLobbyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (authLoading || loading) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Container>;
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => router.push('/lobbies')}>Back to Lobbies</Button>}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!lobby) return null;

  const isOwner = user && user.uid === lobby.createdBy.uid;
  const players = lobby.players ? Object.entries(lobby.players) : [];
  const playerSlots = Array.from({ length: lobby.maxPlayers });
  const playerProgress = (players.length / lobby.maxPlayers) * 100;

  const getGameIcon = (gameType) => {
    switch (gameType) {
      case 'Tic-Tac-Toe': return <GridOnIcon />;
      case 'Rock, Paper, Scissors': return <SportsKabaddiIcon />;
      case 'Connect Four': return <SportsEsportsIcon />;
      default: return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={4} sx={{ borderRadius: 3, p: { xs: 2, sm: 3, md: 4 } }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>{lobby.name}</Typography>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Chip icon={getGameIcon(lobby.gameType)} label={lobby.gameType} variant="outlined" color="secondary" />
              <Chip icon={lobby.isPublic ? <PublicIcon /> : <LockIcon />} label={lobby.isPublic ? 'Public' : 'Private'} variant="outlined" />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Lobby Controls</Typography>
            <Box>
              {isOwner && (
                <Button variant="contained" color="success" startIcon={<PlayCircleFilledIcon />} onClick={handleStartGame} fullWidth disabled={players.length < lobby.maxPlayers} sx={{ mb: 1, py: 1.5 }}>
                  Start Game
                </Button>
              )}
              <Button variant="outlined" color="warning" startIcon={<ExitToAppIcon />} onClick={handleLeaveLobby} fullWidth sx={{ mb: 1 }}>
                Leave Lobby
              </Button>
              {isOwner && (
                <Button variant="text" color="error" startIcon={<DeleteForeverIcon />} onClick={handleDeleteLobby} fullWidth>
                  Delete Lobby
                </Button>
              )}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Invite Link</Typography>
            <Box display="flex" alignItems="center">
              <TextField value={window.location.href} fullWidth variant="outlined" size="small" disabled />
              <Tooltip title={copied ? "Copied!" : "Copy Link"}>
                <IconButton onClick={copyLobbyLink}><ContentCopyIcon /></IconButton>
              </Tooltip>
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h5">Waiting for Players</Typography>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1} mt={1}>
                <GroupIcon color="action" />
                <Typography variant="body1" color="text.secondary">{`${players.length} / ${lobby.maxPlayers} players ready`}</Typography>
              </Box>
              <LinearProgress variant="determinate" value={playerProgress} sx={{ height: 8, borderRadius: 4, mt: 1 }} />
            </Box>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" gutterBottom>Players in Lobby</Typography>
            <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
              {playerSlots.map((_, index) => {
                const [uid, player] = players[index] || [];
                return (
                  <React.Fragment key={index}>
                    <ListItem sx={{ py: 1.5, px: 2 }}>
                      {player ? (
                        <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 1.5, borderRadius: 2, width: '100%' }}>
                          <ListItemAvatar>
                            <Avatar src={player.photoURL} sx={{ width: 48, height: 48, mr: 1.5 }} />
                          </ListItemAvatar>
                          <ListItemText primary={<Typography variant="h6">{player.displayName}</Typography>} />
                          {uid === lobby.createdBy.uid && <Tooltip title="Lobby Owner"><CrownIcon color="warning" sx={{ fontSize: 28 }} /></Tooltip>}
                        </Card>
                      ) : (
                        <EmptyPlayerSlot sx={{ width: '100%', py: 1.5 }}>
                          <Typography variant="body1" color="text.secondary">Waiting...</Typography>
                        </EmptyPlayerSlot>
                      )}
                    </ListItem>
                    {index < playerSlots.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                );
              })}
            </List>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
