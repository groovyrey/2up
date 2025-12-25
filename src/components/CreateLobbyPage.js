'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { ref, push } from 'firebase/database';
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
  Alert
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import GridOnIcon from '@mui/icons-material/GridOn';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import CreateIcon from '@mui/icons-material/Create';

const gameTypes = [
  {
    name: 'Tic-Tac-Toe',
    icon: <GridOnIcon fontSize="large" />,
    description: 'The classic game of Xs and Os. First to get 3 in a row wins!',
  },
  {
    name: 'Rock, Paper, Scissors',
    icon: <SportsKabaddiIcon fontSize="large" />,
    description: 'A simple game of choices. Best out of three rounds!',
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
    if (!user) {
      setError('You must be logged in to create a lobby.');
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

    const displayName = profile?.displayName || user?.displayName || 'Anonymous';

    const newLobby = {
      name: lobbyName,
      maxPlayers: 2,
      isPublic: isPublic === 'true',
      ownerId: user.uid,
      ownerName: displayName,
      players: {},
      status: 'waiting',
      gameType: gameType,
      createdAt: Date.now(),
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
        <Alert severity="warning">Please log in to create a lobby.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={4} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
          Create a New Lobby
        </Typography>
        <form onSubmit={handleCreateLobby}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>1. Lobby Details</Typography>
            <TextField
              label="Lobby Name"
              variant="outlined"
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
                <ToggleButton value="true"><LockOpenIcon sx={{ mr: 1 }} />Public</ToggleButton>
                <ToggleButton value="false"><LockIcon sx={{ mr: 1 }} />Private</ToggleButton>
              </ToggleButtonGroup>
            </FormControl>
            <Collapse in={isPublic === 'false'}>
              <TextField
                label="Password"
                variant="outlined"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={isPublic === 'false'}
                sx={{ mt: 2 }}
              />
            </Collapse>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>2. Choose a Game</Typography>
            <Grid container spacing={2}>
              {gameTypes.map((game) => (
                <Grid item xs={12} sm={6} key={game.name}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderColor: gameType === game.name ? 'primary.main' : 'divider',
                      borderWidth: 2,
                      height: '100%',
                    }}
                  >
                    <CardActionArea onClick={() => setGameType(game.name)} sx={{ height: '100%' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        {game.icon}
                        <Typography variant="h6" component="div">{game.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{game.description}</Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
          
          <Button
            type="submit"
            variant="contained"
            size="large"
            color="primary"
            fullWidth
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <CreateIcon />}
            sx={{ mt: 2, py: 1.5, fontWeight: 'bold' }}
          >
            {submitting ? 'Creating...' : 'Create Lobby'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
