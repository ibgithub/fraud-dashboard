-- =============================================================================
-- m_branch : master cabang untuk bag_demo (schema ods).
-- id (serial), code (branch_code di ods.mv_h), name (nama cabang / kota),
-- address (alamat kota di Indonesia).
-- Cabang dengan nasabah terbanyak (ID0010008) = Jakarta Pusat.
-- Idempotent: DROP + CREATE lalu seed ulang.
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS ods;

DROP TABLE IF EXISTS ods.m_branch;
CREATE TABLE ods.m_branch (
    id      SERIAL PRIMARY KEY,
    code    VARCHAR(32) NOT NULL UNIQUE,
    name    TEXT        NOT NULL,
    address TEXT
);

INSERT INTO ods.m_branch (code, name, address) VALUES
('ID0010008', 'KC Jakarta Pusat',    'Jl. M.H. Thamrin No. 1, Jakarta Pusat, DKI Jakarta'),
('ID0010005', 'KC Jakarta Selatan',  'Jl. Jend. Sudirman Kav. 52, Jakarta Selatan, DKI Jakarta'),
('ID0010099', 'KC Surabaya',         'Jl. Basuki Rahmat No. 2, Surabaya, Jawa Timur'),
('ID0010120', 'KC Bandung',          'Jl. Asia Afrika No. 8, Bandung, Jawa Barat'),
('ID0010170', 'KC Medan',            'Jl. Putri Hijau No. 10, Medan, Sumatera Utara'),
('ID0010030', 'KC Semarang',         'Jl. Pemuda No. 142, Semarang, Jawa Tengah'),
('ID0010270', 'KC Makassar',         'Jl. Jend. Sudirman No. 5, Makassar, Sulawesi Selatan'),
('ID0010080', 'KC Jakarta Barat',    'Jl. S. Parman Kav. 3, Jakarta Barat, DKI Jakarta'),
('ID0010110', 'KC Jakarta Timur',    'Jl. Matraman Raya No. 15, Jakarta Timur, DKI Jakarta'),
('ID0010282', 'KC Jakarta Utara',    'Jl. Yos Sudarso No. 22, Jakarta Utara, DKI Jakarta'),
('ID0010006', 'KC Tangerang',        'Jl. Jend. Sudirman No. 1, Tangerang, Banten'),
('ID0010052', 'KC Bekasi',           'Jl. Ahmad Yani No. 1, Bekasi, Jawa Barat'),
('ID0010300', 'KC Depok',            'Jl. Margonda Raya No. 100, Depok, Jawa Barat'),
('ID0010130', 'KC Bogor',            'Jl. Padjajaran No. 17, Bogor, Jawa Barat'),
('ID0010061', 'KC Denpasar',         'Jl. Teuku Umar No. 90, Denpasar, Bali'),
('ID0010016', 'KC Yogyakarta',       'Jl. Malioboro No. 60, Yogyakarta, DIY'),
('ID0010109', 'KC Palembang',        'Jl. Jend. Sudirman No. 7, Palembang, Sumatera Selatan'),
('ID0010060', 'KC Malang',           'Jl. Basuki Rahmat No. 25, Malang, Jawa Timur'),
('ID0010108', 'KC Batam',            'Jl. Imam Bonjol, Batam, Kepulauan Riau'),
('ID0010018', 'KC Pekanbaru',        'Jl. Jend. Sudirman No. 12, Pekanbaru, Riau'),
('ID0010210', 'KC Banjarmasin',      'Jl. Lambung Mangkurat No. 3, Banjarmasin, Kalimantan Selatan'),
('ID0010002', 'KC Balikpapan',       'Jl. Jend. Sudirman No. 44, Balikpapan, Kalimantan Timur'),
('ID0010250', 'KC Samarinda',        'Jl. Mulawarman No. 2, Samarinda, Kalimantan Timur'),
('ID0010090', 'KC Manado',           'Jl. Piere Tendean No. 1, Manado, Sulawesi Utara'),
('ID0010031', 'KC Padang',           'Jl. Jend. Sudirman No. 3, Padang, Sumatera Barat'),
('ID0010055', 'KC Bandar Lampung',   'Jl. Raden Intan No. 9, Bandar Lampung, Lampung'),
('ID0010029', 'KC Pontianak',        'Jl. Tanjungpura No. 4, Pontianak, Kalimantan Barat'),
('ID0010092', 'KC Solo',             'Jl. Slamet Riyadi No. 20, Surakarta, Jawa Tengah'),
('ID0010009', 'KC Cirebon',          'Jl. Siliwangi No. 11, Cirebon, Jawa Barat'),
('ID0010281', 'KC Jambi',            'Jl. Gatot Subroto No. 6, Jambi, Jambi'),
('ID0010180', 'KC Pekalongan',       'Jl. Hayam Wuruk No. 8, Pekalongan, Jawa Tengah'),
('ID0010028', 'KC Serang',           'Jl. Ahmad Yani No. 30, Serang, Banten'),
('ID0010172', 'KC Tegal',            'Jl. Gajah Mada No. 14, Tegal, Jawa Tengah'),
('ID0010070', 'KC Kediri',           'Jl. Brawijaya No. 2, Kediri, Jawa Timur'),
('ID0010220', 'KC Sidoarjo',         'Jl. Ahmad Yani No. 17, Sidoarjo, Jawa Timur'),
('ID0010190', 'KC Jember',           'Jl. Gajah Mada No. 100, Jember, Jawa Timur'),
('ID0010320', 'KC Mataram',          'Jl. Pejanggik No. 5, Mataram, Nusa Tenggara Barat'),
('ID0010022', 'KC Kupang',           'Jl. Mohammad Hatta No. 1, Kupang, Nusa Tenggara Timur'),
('ID0010310', 'KC Jayapura',         'Jl. Ahmad Yani No. 8, Jayapura, Papua'),
('ID0010020', 'KC Ambon',            'Jl. Diponegoro No. 2, Ambon, Maluku'),
('ID0010010', 'KC Palu',             'Jl. Sam Ratulangi No. 7, Palu, Sulawesi Tengah'),
('ID0010012', 'KC Kendari',          'Jl. Ahmad Yani No. 19, Kendari, Sulawesi Tenggara'),
('ID0010011', 'KC Gorontalo',        'Jl. Nani Wartabone No. 3, Gorontalo, Gorontalo'),
('ID0010251', 'KC Banda Aceh',       'Jl. Teuku Umar No. 15, Banda Aceh, Aceh'),
('ID0010015', 'KC Bengkulu',         'Jl. S. Parman No. 6, Bengkulu, Bengkulu'),
('ID0010023', 'KC Pangkal Pinang',   'Jl. Jend. Sudirman No. 4, Pangkal Pinang, Kepulauan Bangka Belitung'),
('ID0010096', 'KC Tanjung Pinang',   'Jl. Basuki Rahmat No. 10, Tanjung Pinang, Kepulauan Riau'),
('ID0010036', 'KC Cilegon',          'Jl. Ahmad Yani No. 50, Cilegon, Banten'),
('ID0010350', 'KC Sukabumi',         'Jl. Ahmad Yani No. 25, Sukabumi, Jawa Barat'),
('ID0010200', 'KC Tasikmalaya',      'Jl. H.Z. Mustofa No. 9, Tasikmalaya, Jawa Barat'),
('ID0010330', 'KC Purwokerto',       'Jl. Jend. Sudirman No. 2, Purwokerto, Jawa Tengah'),
('ID0010003', 'KC Magelang',         'Jl. Pemuda No. 30, Magelang, Jawa Tengah'),
('ID0010260', 'KC Madiun',           'Jl. Pahlawan No. 1, Madiun, Jawa Timur'),
('ID0010279', 'KC Probolinggo',      'Jl. Panglima Sudirman No. 7, Probolinggo, Jawa Timur'),
('ID0010071', 'KC Banyuwangi',       'Jl. Ahmad Yani No. 40, Banyuwangi, Jawa Timur'),
('ID0010230', 'KC Palangkaraya',     'Jl. Ahmad Yani No. 12, Palangkaraya, Kalimantan Tengah'),
('ID0010098', 'KC Tarakan',          'Jl. Jend. Sudirman No. 6, Tarakan, Kalimantan Utara'),
('ID0010001', 'KC Sorong',           'Jl. Ahmad Yani No. 3, Sorong, Papua Barat'),
('ID0010273', 'KC Ternate',          'Jl. Pahlawan Revolusi No. 1, Ternate, Maluku Utara'),
('ID0010026', 'KC Bitung',           'Jl. Sam Ratulangi No. 20, Bitung, Sulawesi Utara'),
('ID0010105', 'KC Singkawang',       'Jl. Diponegoro No. 5, Singkawang, Kalimantan Barat');

-- Verifikasi
SELECT COUNT(*) AS total_branches FROM ods.m_branch;
SELECT code, name FROM ods.m_branch ORDER BY code LIMIT 5;
