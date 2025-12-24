import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import ThemeRegistry from '../theme/ThemeRegistry';
import AppAppBar from '../components/AppBar';
import { Box } from '@mui/material';

export const metadata = {
  title: "2up",
  description: "A web app by 2up",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <AuthProvider>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <AppAppBar />
              <Box component="main" sx={{ flexGrow: 1 }}>
                {children}
              </Box>
            </Box>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
