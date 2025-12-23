'use client';
import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { NextAppDirEmotionCacheProvider } from './EmotionCache';

export const ColorModeContext = React.createContext({ toggleColorMode: () => {} });

export default function ThemeRegistry({ children }) {
  const [mode, setMode] = React.useState('light');

  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // palette values for light mode
                primary: { main: '#556cd6' },
                secondary: { main: '#19857b' },
              }
            : {
                // palette values for dark mode
                primary: { main: '#bb86fc' },
                secondary: { main: '#03dac6' },
                background: {
                  default: '#121212',
                  paper: '#1e1e1e',
                },
                text: {
                  primary: '#fff',
                  secondary: '#b3b3b3',
                },
              }),
        },
      }),
    [mode],
  );

  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </NextAppDirEmotionCacheProvider>
  );
}
