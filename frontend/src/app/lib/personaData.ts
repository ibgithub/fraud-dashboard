// Shared persona/cluster characteristics data.
// Used by Segmentation Characteristics and CPI Matrix Hot Target pages.

export interface PersonaCluster {
  id: number;
  clusterKey: string; // matches PERSONA_LABELS key in hot target (cluster_0..3)
  nameId: string;
  nameEn: string;
  totalId: string;
  totalEn: string;
  focusProductId: string;
  focusProductEn: string;
  keyCharacteristicsId: string[];
  keyCharacteristicsEn: string[];
  strategiesId: string[];
  strategiesEn: string[];
}

export const PERSONA_CLUSTERS: PersonaCluster[] = [
  {
    id: 0,
    clusterKey: 'cluster_1',
    nameId: 'Senior & Aman',
    nameEn: 'Senior & Secure',
    totalId: '2.450 nasabah (35%)',
    totalEn: '2,450 customers (35%)',
    focusProductId: 'Deposito & Obligasi Risk-Free',
    focusProductEn: 'Deposits & Risk-Free Bonds',
    keyCharacteristicsId: [
      'Nasabah usia lanjut, memiliki pendapatan stabil, dan fokus pada keamanan dana.',
      'Mereka cenderung lebih memilih rekening tabungan tradisional dan produk investasi yang aman.',
    ],
    keyCharacteristicsEn: [
      'Senior customers with stable income and a primary focus on fund security.',
      'They tend to prefer traditional savings accounts and low-risk investment products.',
    ],
    strategiesId: [
      'Tawarkan produk-produk tabungan dengan suku bunga kompetitif, layanan konsultasi keuangan personal, dan edukasi tentang pengelolaan risiko.',
      'Fokus pada kemitraan dengan lembaga pensiun dan perusahaan asuransi.',
    ],
    strategiesEn: [
      'Offer savings products with competitive interest rates, personal financial advisory services, and risk management education.',
      'Focus on partnerships with pension funds and insurance companies.',
    ],
  },
  {
    id: 1,
    clusterKey: 'cluster_3',
    nameId: 'Nasabah Rentan & Membutuhkan Bantuan',
    nameEn: 'Vulnerable & Support-Seeking Customers',
    totalId: '1.890 nasabah (27%)',
    totalEn: '1,890 customers (27%)',
    focusProductId: 'Restrukturisasi & Edukasi Finansial',
    focusProductEn: 'Restructuring & Financial Literacy',
    keyCharacteristicsId: [
      'Nasabah dengan saldo rendah atau kesulitan dalam mengelola keuangan.',
      'Mereka membutuhkan bantuan untuk meningkatkan literasi finansial dan membangun tabungan.',
    ],
    keyCharacteristicsEn: [
      'Customers with low balances or difficulties in managing finances.',
      'They require assistance to improve financial literacy and build savings.',
    ],
    strategiesId: [
      'Tawarkan program edukasi keuangan gratis, layanan konsultasi personal, dan produk perbankan yang terjangkau.',
      'Fokus pada kampanye digital yang menargetkan kelompok rentan dengan pesan yang sensitif.',
    ],
    strategiesEn: [
      'Offer free financial education programs, personal consulting services, and affordable banking products.',
      'Focus on digital campaigns targeting vulnerable groups with empathetic messaging.',
    ],
  },
  {
    id: 2,
    clusterKey: 'cluster_0',
    nameId: 'Pelajar Muda & Produktif',
    nameEn: 'Young Students & Productive Youth',
    totalId: '1.720 nasabah (24%)',
    totalEn: '1,720 customers (24%)',
    focusProductId: 'Mobile Banking & QRIS Reward',
    focusProductEn: 'Mobile Banking & QRIS Rewards',
    keyCharacteristicsId: [
      'Nasabah muda, memiliki tingkat pendidikan tinggi, dan aktif dalam kegiatan ekonomi digital.',
      'Mereka cenderung menggunakan mobile banking untuk transaksi sehari-hari dan mencari produk keuangan yang inovatif.',
    ],
    keyCharacteristicsEn: [
      'Young customers with high education levels and active participation in the digital economy.',
      'They tend to use mobile banking for daily transactions and seek innovative financial products.',
    ],
    strategiesId: [
      'Gunakan kampanye digital fokus pada fitur mobile banking, aplikasi mobile banking, dan kemitraan dengan platform e-commerce populer.',
      'Tawarkan program edukasi digital untuk meningkatkan literasi finansial nasabah.',
      'Fokus pada produk tabungan digital dan investasi.',
    ],
    strategiesEn: [
      'Utilize digital campaigns focused on mobile banking features, mobile apps, and partnerships with popular e-commerce platforms.',
      'Offer digital education programs to boost customers\' financial literacy.',
      'Focus on digital savings products and investments.',
    ],
  },
  {
    id: 3,
    clusterKey: 'cluster_2',
    nameId: 'Pengusaha Kecil & Berorientasi Pertumbuhan',
    nameEn: 'Small Business & Growth-Oriented Entrepreneurs',
    totalId: '980 nasabah (14%)',
    totalEn: '980 customers (14%)',
    focusProductId: 'Kredit Modal Kerja & Merchant QRIS',
    focusProductEn: 'Working Capital Loan & Merchant QRIS',
    keyCharacteristicsId: [
      'Nasabah yang menjalankan bisnis kecil, mencari solusi keuangan untuk mengelola arus kas dan meningkatkan produktivitas.',
      'Mereka membutuhkan akses mudah ke layanan perbankan dan pinjaman.',
    ],
    keyCharacteristicsEn: [
      'Customers running small businesses, seeking financial solutions to manage cash flow and increase productivity.',
      'They require easy access to banking services and business loans.',
    ],
    strategiesId: [
      'Tawarkan produk pinjaman mikro dengan persyaratan yang fleksibel, layanan pembayaran digital, dan solusi manajemen keuangan bisnis.',
      'Fokus pada kemitraan dengan asosiasi pelaku usaha kecil.',
    ],
    strategiesEn: [
      'Offer micro-loan products with flexible requirements, digital payment services, and business financial management solutions.',
      'Focus on partnerships with small business associations.',
    ],
  },
];

// Statistic rows (values ordered by PERSONA_CLUSTERS index)
export const PERSONA_CHARACTERISTICS = [
  { labelId: 'Rata-rata Usia', labelEn: 'Avg Age', values: [56, 42, 24, 39] },
  { labelId: 'Rata-rata Pendidikan (thn)', labelEn: 'Avg Education (yr)', values: [16, 12, 15, 16] },
  { labelId: 'Rata-rata Pendapatan (jt)', labelEn: 'Avg Income (jt)', values: [98, 28, 38, 145] },
  { labelId: 'Rata-rata Masa Nasabah (thn)', labelEn: 'Avg Tenure (yr)', values: [18, 6, 2, 8] },
  { labelId: 'Penggunaan Digital (%)', labelEn: 'Digital Usage (%)', values: [32, 45, 95, 78] },
];

// Find the PERSONA_CLUSTERS entry for a given hot-target cluster key (cluster_0..3)
export function clusterIndexByKey(clusterKey: string): number {
  const idx = PERSONA_CLUSTERS.findIndex((c) => c.clusterKey === clusterKey);
  return idx >= 0 ? idx : 0;
}
