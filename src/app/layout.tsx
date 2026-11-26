import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'TriKun Love Studio – Tạo Quà Tặng Số',
  description:
    'Tạo quà tặng số với lời chúc, hình ảnh, nhạc nền và mã QR trên TriKun Love Studio.',
  keywords: [
    'tạo website quà tặng',
    'web tỏ tình',
    'quà tặng người yêu',
    'valentine',
    'sinh nhật',
    'mã qr trái tim',
    'trí kun studio',
    'trikun love'
  ],
  authors: [{ name: 'Trí Kun Studio' }],
  icons: {
    icon: '/icons/logo-heart.svg'
  },
  openGraph: {
    title: 'TriKun Love Studio – Vũ Trụ Quà Tặng Số 2026',
    description: 'Tạo website tỏ tình, trái tim 3D lấp lánh tặng người yêu chỉ trong 30 giây.',
    type: 'website'
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=Caveat:wght@600;700&family=Cormorant+Garamond:ital,wght@0,700;1,700&family=Dancing+Script:wght@600;700&family=Lora:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Playpen+Sans:wght@400;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-[#FFFBFC] text-[#2D1F24] font-sans selection:bg-[#FF4F86]/20 selection:text-[#FF4F86]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
