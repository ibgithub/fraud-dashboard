-- ============================================================
-- V11: Create ref.job_type lookup table and seed from Job_Type.csv
--   Columns: id, kode, deskripsi, kategori
--   Used to translate ods.demografi.occupation_type (numeric code)
--   into a human-readable job description/category.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS ref;

CREATE TABLE IF NOT EXISTS ref.job_type (
    id        integer PRIMARY KEY,
    kode      integer NOT NULL,
    deskripsi text    NOT NULL,
    kategori  text
);

-- Idempotent seed: clear then insert
DELETE FROM ref.job_type;

INSERT INTO ref.job_type (id, kode, deskripsi, kategori) VALUES
(1,  1,  'EKSEKUTIF/MANAGERIAL',                                'Eksekutif'),
(2,  2,  'WIRASWASTA (DGN.IZIN USAHA)',                         'Pengusaha'),
(3,  3,  'WIRASWASTA LAINNYA',                                  'Pengusaha'),
(4,  4,  'BURUH PABRIK/SUPIR',                                  'Buruh'),
(5,  5,  'KARYAWAN TANPA SLIP GAJI',                            'Buruh'),
(6,  6,  'SUPIR ANKUTAN KOTA/TRUK',                             'Buruh'),
(7,  7,  'SENIMAN',                                             'Kreatif'),
(8,  8,  'ANGGOTA KELUARGA I-V',                                'N/A'),
(9,  9,  'PENSIUNAN',                                           'N/A'),
(10, 10, 'PROFF (PENGACARA, KURATOR, NOTARIS, ARSITEK, KONS)',  'Profesional'),
(11, 11, 'AKADEMIS/PELAJAR',                                    'N/A'),
(12, 12, 'SARJANA TEKNIK',                                      'Profesional'),
(13, 13, 'SARJANA LAINNYA',                                     'Profesional'),
(14, 14, 'CUSTOMER SERVICE SUPPORT',                            'Pegawai'),
(15, 15, 'SALES/MARKETING',                                     'Pegawai'),
(16, 16, 'PEMBORONG BANGUNAN',                                  'Pengusaha'),
(17, 17, 'PEG. ADM. (PEMERINTAH/SWASTA)',                       'Pegawai'),
(18, 18, 'KEPALA NEGARA',                                       'Pejabat'),
(19, 19, 'WAKIL KEPALA NEGARA',                                 'Pejabat'),
(20, 20, 'PEJABAT TINGGI PEMERINTAHAN (SETARA ESELON I, II)',   'Pejabat'),
(21, 21, 'PEJABAT PERSH. BUMN/D',                               'Pejabat'),
(22, 22, 'KETUA/EKSEKUTIF PARTAI POLITIK',                      'Pejabat'),
(23, 23, 'PEJABAT/STAF KEJAKSAAN AGUNG',                        'Pegawai'),
(24, 24, 'PEJABAT/STAF DEPT. KEHAKIMAN',                        'Pegawai'),
(25, 25, 'PEJABAT/STAF MAHKAMAH AGUNG',                         'Pegawai'),
(26, 26, 'PEJABAT/STAF PENGADILAN TINGGI',                      'Pegawai'),
(27, 27, 'PEJABAT/STAF PENGADILAN NEGERI',                      'Pegawai'),
(28, 28, 'PEJABAT/STAF BANK INDONESIA',                         'Pegawai'),
(29, 29, 'PEJABAT/STAF KEPOLISIAN RI&TNI',                      'Pegawai'),
(30, 30, 'PEGAWAI NEGERI',                                      'Pegawai'),
(31, 31, 'KEP DAERAH TK I,II,CAMAT,LURAH',                      'Pejabat'),
(32, 32, 'PERUSAHAAN BERHUB DENGAN I-V',                        'Pengusaha'),
(33, 33, 'YAYASAN BERHUB DENGAN I-V',                           'Pegawai'),
(34, 34, 'SELEBRITIS',                                          'Kreatif'),
(35, 35, 'BELUM DIKETAHUI',                                     'N/A'),
(36, 36, 'MENTERI',                                             'Pejabat'),
(37, 37, 'WAKIL MENTERI',                                       'Pejabat'),
(38, 38, 'ANGGOTA DPR',                                         'Pejabat'),
(39, 39, 'ANGGOTA DPRD',                                        'Pejabat'),
(40, 40, 'ANGGOTA MPR',                                         'Pejabat'),
(41, 41, 'ANGGOTA BADAN PEMERIKSA KEUANGAN',                    'Pejabat'),
(42, 42, 'ANGGOTA DEWAN KOMISIONER (ADK) OJK',                  'Pejabat'),
(43, 43, 'PEJABAT SELAIN ADK/ STAFF OJK',                       'Pejabat'),
(44, 44, 'PIMPINAN KPK',                                        'Pejabat'),
(45, 45, 'STAFF KPK',                                           'Pegawai'),
(46, 46, 'ANGGOTA KOMISI YUDISIAL',                             'Pegawai'),
(47, 47, 'DUTA BESAR',                                          'Pejabat'),
(48, 48, 'PIMPINAN PERGURUAN TINGGI NEGERI',                    'Eksekutif'),
(49, 49, 'PIMPINAN PERGURUAN TINGGI SWASTA',                    'Eksekutif'),
(50, 50, 'WAKIL KEPALA DAERAH TINGKAT I, II, CAMAT, LURAH',     'Pejabat'),
(51, 51, 'PETANI',                                              'Buruh'),
(52, 52, 'PETERNAK',                                            'Buruh'),
(53, 53, 'TENAGA KERJA KESEHATAN',                              'Pegawai'),
(54, 54, 'PEJABAT/STAFF PENYEDIA JASA KEUANGAN',                'Pegawai'),
(55, 55, 'IBU RUMAH TANGGA',                                    'N/A'),
(56, 56, 'PEMUKA AGAMA',                                        'Profesional'),
(57, 57, 'ATLET/OLAHRAGAWAN',                                   'Profesional'),
(58, 58, 'PEJABAT PEMBUAT AKTA TANAH',                          'Pejabat'),
(59, 59, 'AGEN PROPERTY',                                       'Pegawai');
