import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import ThemeRegistry from '../theme/ThemeRegistry';

export const metadata = {
  title: "My App",
  description: "My new web app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
