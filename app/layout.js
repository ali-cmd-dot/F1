import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata = {
  title: 'Cautio Insights',
  description: 'Video request & incident analytics',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
