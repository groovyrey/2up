"use client";

import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Grid, Paper } from '@mui/material';

const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER_1 = 1;
const PLAYER_2 = 2;

const initialBoard = Array(ROWS).fill(0).map(() => Array(COLS).fill(EMPTY));

export default function ConnectFourGame({ gameId, initialGameState, onGameUpdate, currentPlayerId, player1Id, player2Id }) {
  const [board, setBoard] = useState(initialGameState?.board || initialBoard);
    const [currentPlayerUid, setCurrentPlayerUid] = useState(initialGameState?.currentPlayer || Object.keys(initialGameState.players)[0]); // Store UID
  const [winner, setWinner] = useState(initialGameState?.winner || null);
  const [isDraw, setIsDraw] = useState(initialGameState?.isDraw || false);

  // Map player UIDs to PLAYER_1 and PLAYER_2 constants for board logic
  const playersMap = useRef({});

  useEffect(() => {
    if (initialGameState && initialGameState.players) {
      const playerUids = Object.keys(initialGameState.players);
      playersMap.current[PLAYER_1] = playerUids[0];
      playersMap.current[PLAYER_2] = playerUids[1];

      // Ensure board is an array of arrays
      const convertToArray = (obj) => {
        if (Array.isArray(obj)) {
          return obj.map(item => (typeof item === 'object' && item !== null) ? convertToArray(item) : item);
        }
        if (typeof obj === 'object' && obj !== null) {
          const arr = Object.keys(obj).sort((a, b) => parseInt(a) - parseInt(b)).map(key => obj[key]);
          return arr.map(item => (typeof item === 'object' && item !== null) ? convertToArray(item) : item);
        }
        return obj;
      };

      const loadedBoard = initialGameState.board
        ? convertToArray(initialGameState.board)
        : initialBoard;

      setBoard(loadedBoard);
      setCurrentPlayerUid(initialGameState.currentPlayer); // Set current player as UID
      setWinner(initialGameState.winner);
      setIsDraw(initialGameState.isDraw);
    }
  }, [initialGameState]);

  const checkWin = (currentBoard) => {
    // Check horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (currentBoard[r][c] !== EMPTY &&
            currentBoard[r][c] === currentBoard[r][c + 1] &&
            currentBoard[r][c] === currentBoard[r][c + 2] &&
            currentBoard[r][c] === currentBoard[r][c + 3]) {
          return currentBoard[r][c];
        }
      }
    }

    // Check vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 4; r++) {
        if (currentBoard[r][c] !== EMPTY &&
            currentBoard[r][c] === currentBoard[r + 1][c] &&
            currentBoard[r][c] === currentBoard[r + 2][c] &&
            currentBoard[r][c] === currentBoard[r + 3][c]) {
          return currentBoard[r][c];
        }
      }
    }

    // Check diagonal (top-left to bottom-right)
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        if (currentBoard[r][c] !== EMPTY &&
            currentBoard[r][c] === currentBoard[r + 1][c + 1] &&
            currentBoard[r][c] === currentBoard[r + 2][c + 2] &&
            currentBoard[r][c] === currentBoard[r + 3][c + 3]) {
          return currentBoard[r][c];
        }
      }
    }

    // Check diagonal (top-right to bottom-left)
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 3; c < COLS; c++) {
        if (currentBoard[r][c] !== EMPTY &&
            currentBoard[r][c] === currentBoard[r + 1][c - 1] &&
            currentBoard[r][c] === currentBoard[r + 2][c - 2] &&
            currentBoard[r][c] === currentBoard[r + 3][c - 3]) {
          return currentBoard[r][c];
        }
      }
    }

    return null;
  };

  const checkDraw = (currentBoard) => {
    return currentBoard.every(row => row.every(cell => cell !== EMPTY));
  };

  const handleColumnClick = (col) => {
    const playerMark = (currentPlayerUid === playersMap.current[PLAYER_1]) ? PLAYER_1 : PLAYER_2;

    if (winner || isDraw || currentPlayerUid !== currentPlayerId) {
      return;
    }

    let newBoard = board.map(row => [...row]);
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (newBoard[r][col] === EMPTY) {
        newBoard[r][col] = playerMark;
        row = r;
        break;
      }
    }

    if (row === -1) return; // Column is full

    const newWinner = checkWin(newBoard);
    const newIsDraw = !newWinner && checkDraw(newBoard);

    const nextPlayerUid = (currentPlayerUid === playersMap.current[PLAYER_1])
      ? playersMap.current[PLAYER_2]
      : playersMap.current[PLAYER_1];

    const updatedGameState = {
      board: newBoard,
      currentPlayer: newWinner || newIsDraw ? currentPlayerUid : nextPlayerUid, // Keep current player if game ends
      winner: newWinner,
      isDraw: newIsDraw,
    };

    onGameUpdate(gameId, updatedGameState);
  };

  const getCellColor = (cellValue) => {
    if (cellValue === PLAYER_1) return 'red';
    if (cellValue === PLAYER_2) return 'yellow';
    return 'lightgray';
  };

  const getPlayerName = (playerNum) => {
    const uid = playersMap.current[playerNum];
    return initialGameState.players[uid]?.displayName || `Player ${playerNum}`;
  };

  const isCurrentPlayerTurn = currentPlayerUid === currentPlayerId;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Connect Four</Typography>
      {winner ? (
        <Typography variant="h5" color="primary">Winner: {initialGameState.players[playersMap.current[winner]]?.displayName}!</Typography>
      ) : isDraw ? (
        <Typography variant="h5" color="text.secondary">It's a Draw!</Typography>
      ) : (
        <Typography variant="h5">Current Turn: {getPlayerName(currentPlayerUid === playersMap.current[PLAYER_1] ? PLAYER_1 : PLAYER_2)}</Typography>
      )}
      {!winner && !isDraw && (
        <Typography variant="subtitle1" color="text.secondary">
          {isCurrentPlayerTurn ? "Your turn" : `Waiting for ${getPlayerName(currentPlayer)}`}
        </Typography>
      )}

      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Grid container spacing={0.5} sx={{ border: '2px solid #333', bgcolor: 'blue' }}>
          {board.map((row, rIdx) => (
            <Grid container item key={rIdx} spacing={0.5}>
              {row.map((cell, cIdx) => (
                <Grid item key={cIdx}>
                  <Paper
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      bgcolor: getCellColor(cell),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      // cursor: 'pointer', // Removed as clicks are handled by column buttons
                      border: '1px solid #555',
                    }}
                  >
                    {/* Piece */}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ))}
        </Grid>
        <Box sx={{ display: 'flex', mt: 1 }}>
          {Array(COLS).fill(0).map((_, cIdx) => (
            <Button
              key={cIdx}
              onClick={() => handleColumnClick(cIdx)}
              disabled={winner || isDraw || board[0][cIdx] !== EMPTY || !isCurrentPlayerTurn}
              sx={{ minWidth: 50, width: 50, height: 30, p: 0, mx: 0.25 }}
              variant="contained"
              color="primary"
            >
              ▼
            </Button>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
