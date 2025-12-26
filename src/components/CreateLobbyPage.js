'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { ref, push, serverTimestamp } from 'firebase/database';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Box,
  FormControl,
  ToggleButtonGroup,
  ToggleButton,
  Collapse,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Alert,
  Avatar
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import GridOnIcon from '@mui/icons-material/GridOn';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CreateIcon from '@mui/icons-material/Create';

const gameTypes = [
  {
    name: 'Tic-Tac-Toe',
    icon: <GridOnIcon fontSize="large" />,
    description: 'The classic 3x3 grid game. Be the first to get three in a row.',
  },
  {
    name: 'Rock, Paper, Scissors',
    icon: <SportsKabaddiIcon fontSize="large" />,
    description: 'A quick game of choices. Win the best out of three rounds.',
  },
  {
    name: 'Connect Four',
    icon: <SportsEsportsIcon fontSize="large" />,
    description: 'Challenge your opponent to get four of your discs in a row.',
  },
];

export default function CreateLobbyPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lobbyName, setLobbyName] = useState('');
  const [isPublic, setIsPublic] = useState('true');
  const [password, setPassword] = useState('');
  const [gameType, setGameType] = useState('Tic-Tac-Toe');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateLobby = async (e) => {
    e.preventDefault();
    setError('');
    if (!user || !profile) {
      setError('You must be logged in and have a profile to create a lobby.');
      return;
    }
    if (!lobbyName.trim()) {
      setError('Lobby name cannot be empty.');
      return;
    }
    if (isPublic === 'false' && !password) {
      setError('Private lobbies require a password.');
      return;
    }
    setSubmitting(true);

    const newLobby = {
      name: lobbyName,
      maxPlayers: 2,
      isPublic: isPublic === 'true',
      createdBy: {
        uid: user.uid,
        displayName: profile.displayName || 'Anonymous',
        photoURL: profile.photoURL || '',
      },
      players: {},
      status: 'waiting',
      gameType: gameType,
      createdAt: serverTimestamp(),
    };

    if (isPublic === 'false') {
      newLobby.password = password;
    }

    try {
      const lobbiesRef = ref(db, 'lobbies');
      const newLobbyRef = await push(lobbiesRef, newLobby);
      router.push(`/lobbies/${newLobbyRef.key}`);
    } catch (err) {
      setError('Failed to create lobby. Please try again.');
      console.error(err);
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Container>;
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom>Access Denied</Typography>
            <Typography variant="body1">You need to be logged in to create a game lobby.</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={4} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, background: 'rgba(255, 255, 255, 0.05)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                <CreateIcon />
            </Avatar>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              Set Up Your Game
            </Typography>
        </Box>
        <form onSubmit={handleCreateLobby}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>1. Lobby Details</Typography>
            <TextField
              label="Lobby Name"
              variant="filled"
              fullWidth
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <FormControl component="fieldset">
              <ToggleButtonGroup
                color="primary"
                value={isPublic}
                exclusive
                onChange={(e, value) => value && setIsPublic(value)}
                aria-label="Lobby visibility"
              >
                <ToggleButton value="true" sx={{ px: 3 }}><LockOpenIcon sx={{ mr: 1 }} />Public</ToggleButton>
                <ToggleButton value="false" sx={{ px: 3 }}><LockIcon sx={{ mr: 1 }} />Private</ToggleButton>
              </ToggleButtonGroup>
            </FormControl>
            <Collapse in={isPublic === 'false'}>
              <TextField
                label="Lobby Password"
                variant="filled"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={isPublic === 'false'}
                sx={{ mt: 2 }}
              />
            </Collapse>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>2. Choose a Game</Typography>
            <Grid container spacing={2}>
              {gameTypes.map((game) => (
                <Grid item xs={12} sm={4} key={game.name}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderColor: gameType === game.name ? 'primary.main' : 'divider',
                      borderWidth: 2,
                      height: '100%',
                      borderRadius: 2,
                      bgcolor: gameType === game.name ? 'action.selected' : 'transparent',
                      transition: 'transform 0.2s, border-color 0.2s',
                      '&:hover': {
                        transform: 'scale(1.03)'
                      }
                    }}
                  >
                    <CardActionArea onClick={() => setGameType(game.name)} sx={{ height: '100%', p: 2 }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Box color="primary.main" mb={1}>{game.icon}</Box>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>{game.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{game.description}</Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {error && <Alert severity="error" sx={{ my: 2 }} onClose={() => setError('')}>{error}</Alert>}
          
          <Button
            type="submit"
            variant="contained"
            size="large"
            color="primary"
            fullWidth
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={24} color="inherit" /> : <CreateIcon />}
            sx={{ mt: 2, py: 1.5, fontWeight: 'bold', fontSize: '1.1rem', borderRadius: 2 }}
          >
            {submitting ? 'Creating Lobby...' : 'Create & Play'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
