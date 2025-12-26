'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, onValue, update, remove, set, onDisconnect, runTransaction } from 'firebase/database';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import TicTacToeGame from '@/components/TicTacToeGame';
import RockPaperScissorsGame from '@/components/RockPaperScissorsGame';
import ConnectFourGame from '@/components/ConnectFourGame';

export default function GameRoom() {
  const params = useParams();
  const router = useRouter();
  const { id: gameId } = params;
  const { user } = useAuth(); // Get the current user

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!gameId || !user) {
      setLoading(false);
      return;
    }

    const gameRef = ref(db, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const gameData = { id: snapshot.key, ...snapshot.val() };
        // Initialize board based on game type if missing
        if (!gameData.board) {
          if (gameData.gameType === 'Tic-Tac-Toe') {
            gameData.board = Array(9).fill('');
          } else if (gameData.gameType === 'Connect Four') {
            gameData.board = Array(6).fill(0).map(() => Array(7).fill(0));
          }
        }
        setGame(gameData);

        // Game End Detection and Deletion
        if (gameData.status === 'finished' || gameData.status === 'draw' || gameData.winner) {
          // Give a small delay before deleting to allow players to see the final state
          setTimeout(() => {
            remove(gameRef);
            router.replace('/lobbies'); // Redirect after deletion
          }, 5000); // 5 seconds delay
        }

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

    // Player Presence
    const playerPresenceRef = ref(db, `games/${gameId}/presence/${user.uid}`);
    set(playerPresenceRef, true); // Set presence when user enters
    onDisconnect(playerPresenceRef).remove(); // Remove presence on disconnect

    return () => {
      unsubscribe();
      // Use a transaction to safely check and potentially delete the game
      runTransaction(ref(db, `games/${gameId}`), (currentGame) => {
        if (currentGame) {
          const presence = currentGame.presence || {};
          const currentPlayerCount = Object.keys(presence).length;

          // If the current user is the only one in presence, delete the entire game
          if (currentPlayerCount === 1 && presence[user.uid]) {
            return null; // Returning null in a transaction deletes the data
          } else if (presence[user.uid]) {
            // Otherwise, just remove the current user's presence
            delete presence[user.uid];
            currentGame.presence = presence;
          }
        }
        return currentGame; // Return the updated game or null for deletion
      });
    };
  }, [gameId, user, router]);

  if (loading || !user) { // Also wait for user data
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
      return (
        <ConnectFourGame
          gameId={gameId}
          initialGameState={game}
          onGameUpdate={handleGameUpdate}
          currentPlayerId={user.uid}
          player1Id={game.player1Id}
          player2Id={game.player2Id}
        />
      );
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
