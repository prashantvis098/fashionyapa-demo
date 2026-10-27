import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Fashionyapa — Little things. Lovely looks.', description: 'Discover playful hair accessories, everyday jewellery and beauty favourites at Fashionyapa.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
