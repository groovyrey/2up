'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, onValue, update } from 'firebase/database';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import TicTacToeGame from '@/components/TicTacToeGame';
import RockPaperScissorsGame from '@/components/RockPaperScissorsGame';
import ConnectFourGame from '@/components/ConnectFourGame';

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
          // Initialize board based on game type if missing
          if (gameData.gameType === 'Tic-Tac-Toe') {
            gameData.board = Array(9).fill('');
          } else if (gameData.gameType === 'Connect Four') {
            // Use the initialBoard structure from ConnectFourGame
            gameData.board = Array(6).fill(0).map(() => Array(7).fill(0));
          }
          // Add other game types here if they need initial board setup
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

  const handleGameUpdate = async (gameId, updatedGameState) => {
    const gameRef = ref(db, `games/${gameId}`);
    try {
      await update(gameRef, updatedGameState);
    } catch (err) {
      console.error("Error updating game state:", err);
      // Optionally, set an error state here to display to the user
    }
  };

  // Render different game components based on game.gameType
  switch (game.gameType) {
    case 'Tic-Tac-Toe':
      return <TicTacToeGame gameId={gameId} initialGameState={game} onGameUpdate={handleGameUpdate} />;
    case 'Rock, Paper, Scissors':
      return <RockPaperScissorsGame gameId={gameId} initialGameState={game} onGameUpdate={handleGameUpdate} />;
    case 'Connect Four':
      return <ConnectFourGame gameId={gameId} initialGameState={game} onGameUpdate={handleGameUpdate} />;
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
