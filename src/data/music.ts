export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  url: string;
  category: 'romantic' | 'acoustic' | 'lofi' | 'birthday';
}

export const ROMANTIC_PLAYLIST: MusicTrack[] = [
  {
    id: 'm1',
    title: 'Lễ Đường (Romantic Piano)',
    artist: 'TriKun Studio',
    duration: '01:29',
    url: '/audio/leduong.mp3',
    category: 'romantic'
  },
  {
    id: 'm2',
    title: 'Happy Birthday Acoustic',
    artist: 'TriKun Birthday Band',
    duration: '02:12',
    url: '/audio/hpbd.mp3',
    category: 'birthday'
  },
  {
    id: 'm3',
    title: 'Hẹn Em (Sweet Melody)',
    artist: 'TriKun Acoustic',
    duration: '00:38',
    url: '/audio/henem.mp3',
    category: 'acoustic'
  },
  {
    id: 'm4',
    title: 'Gói Trọn Con Tim',
    artist: 'TriKun Studio',
    duration: '00:38',
    url: '/audio/goicontim.mp3',
    category: 'romantic'
  },
  {
    id: 'm5',
    title: 'Thế Giới Của Anh',
    artist: 'TriKun Lofi',
    duration: '00:30',
    url: '/audio/thegioicuaanh.mp3',
    category: 'lofi'
  },
  {
    id: 'm6',
    title: 'Từng Ngày Yêu Em',
    artist: 'TriKun Acoustic',
    duration: '00:35',
    url: '/audio/tungngayyeuem.mp3',
    category: 'acoustic'
  },
  {
    id: 'm7',
    title: 'Kho Báu Của Anh',
    artist: 'TriKun Lofi',
    duration: '00:26',
    url: '/audio/khobau.mp3',
    category: 'lofi'
  }
];
