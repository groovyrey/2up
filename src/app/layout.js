import "./globals.css";

export const metadata = {
  title: "My App",
  description: "My new web app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
