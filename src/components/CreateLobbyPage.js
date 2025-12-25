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
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Paper,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';

export default function CreateLobbyPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lobbyName, setLobbyName] = useState('');
  const [isPublic, setIsPublic] = useState('true');
  const [password, setPassword] = useState('');
  const [gameType, setGameType] = useState('Tic-Tac-Toe'); // New state for game selection
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateLobby = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!user) {
      setError('You must be logged in to create a lobby.');
      setSubmitting(false);
      return;
    }

    if (!lobbyName.trim()) {
      setError('Lobby name cannot be empty.');
      setSubmitting(false);
      return;
    }

    if (isPublic === 'false' && !password) {
      setError('Private lobbies require a password.');
      setSubmitting(false);
      return;
    }

    const displayName = (profile && profile.displayName) || (user && user.displayName) || 'Anonymous';

    const lobbiesRef = ref(db, 'lobbies');
    const newLobby = {
      name: lobbyName,
      maxPlayers: 2,
      isPublic: isPublic === 'true',
      ownerId: user.uid,
      ownerName: displayName,
      players: {}, // Players will be added by presence system
      status: 'waiting', // Initial lobby status
      gameType: gameType, // Add selected game type
    };

    // Initialize game-specific data
    if (gameType === 'Tic-Tac-Toe') {
      newLobby.board = ['', '', '', '', '', '', '', '', '']; // Initialize Tic-Tac-Toe board with empty strings
      newLobby.currentPlayer = user.uid; // Set the lobby creator as the first player
      newLobby.moves = 0;
      newLobby.winner = null;
    } else if (gameType === 'Rock, Paper, Scissors') {
      newLobby.scores = { player1: 0, player2: 0 };
      newLobby.moves = { player1: null, player2: null };
      newLobby.roundWinner = null;
    }

    if (isPublic === 'false') {
      newLobby.password = password;
    }

    try {
      const newLobbyRef = await push(lobbiesRef, newLobby);
      router.push(`/lobbies/${newLobbyRef.key}`);
    } catch (err) {
      setError('Failed to create lobby. Please try again.');
      console.error(err);
      setSubmitting(false);
    }
  };

  if (authLoading) {
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
          Please log in to create a lobby.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Create a New Lobby
        </Typography>
        <form onSubmit={handleCreateLobby}>
          <TextField
            label="Lobby Name"
            variant="outlined"
            fullWidth
            value={lobbyName}
            onChange={(e) => setLobbyName(e.target.value)}
            margin="normal"
            required
          />
          <FormControl component="fieldset" margin="normal">
            <FormLabel component="legend">Visibility</FormLabel>
            <RadioGroup
              row
              name="isPublic"
              value={isPublic}
              onChange={(e) => setIsPublic(e.target.value)}
            >
              <FormControlLabel value="true" control={<Radio />} label="Public" />
              <FormControlLabel value="false" control={<Radio />} label="Private" />
            </RadioGroup>
          </FormControl>
          {isPublic === 'false' && (
            <TextField
              label="Password"
              variant="outlined"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
          )}

          <FormControl fullWidth margin="normal">
            <InputLabel id="game-type-label">Game Type</InputLabel>
            <Select
              labelId="game-type-label"
              id="game-type-select"
              value={gameType}
              label="Game Type"
              onChange={(e) => setGameType(e.target.value)}
            >
              <MenuItem value="Tic-Tac-Toe">Tic-Tac-Toe</MenuItem>
              <MenuItem value="Rock, Paper, Scissors">Rock, Paper, Scissors</MenuItem>
              {/* Add more game types here as needed */}
            </Select>
          </FormControl>

          {error && <Typography color="error" sx={{ my: 2 }}>{error}</Typography>}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={submitting}
            sx={{ mt: 2 }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Create Lobby'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
