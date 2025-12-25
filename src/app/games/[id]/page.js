'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import TicTacToeGame from '@/components/TicTacToeGame'; // Will create this next
import RockPaperScissorsGame from '@/components/RockPaperScissorsGame';

export default function GameRoom() {
  const params = useParams();
  const router = useRouter();
  const { id: gameId } = params;

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    const gameRef = ref(db, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const gameData = { id: snapshot.key, ...snapshot.val() };
        if (!gameData.board) {
          gameData.board = Array(9).fill(''); // Initialize board if missing
        }
        setGame(gameData);
      } else {
        setError('Game not found or has ended.');
        setGame(null);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to load game data.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={() => router.push('/lobbies')}>
          Back to Lobbies
        </Button>
      </Box>
    );
  }

  if (!game) {
    return null; // Should be handled by error or loading
  }

  // Render different game components based on game.gameType
  switch (game.gameType) {
    case 'Tic-Tac-Toe':
      return <TicTacToeGame gameId={gameId} initialGameState={game} />;
    case 'Rock, Paper, Scissors':
      return <RockPaperScissorsGame gameId={gameId} initialGameState={game} />;
    // Add more cases for other game types
    default:
      return (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography color="error">Unknown game type: {game.gameType}</Typography>
          <Button variant="contained" onClick={() => router.push('/lobbies')}>
            Back to Lobbies
          </Button>
        </Box>
      );
  }
}
