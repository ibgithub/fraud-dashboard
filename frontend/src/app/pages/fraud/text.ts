// ID/EN texts for the FraudGuard pages, taken from reference/fraudguard dict.js.
// Kept next to the pages (like other pages that inline lang strings) so the global
// i18n files only carry app-wide strings such as menu labels.
import { useI18n } from '../../i18n';
import type { AnomalyType } from './mockData';

type Entry = [id: string, en: string];

const T = {
  // common
  mock_banner: ['Mockup: data di halaman ini adalah contoh hardcode dan belum terhubung ke backend.', 'Mockup: the data on this page is hardcoded sample data and is not connected to a backend yet.'],
  see_all: ['Lihat semua', 'See all'],
  print: ['Cetak / simpan PDF', 'Print / save PDF'],
  col_customer: ['Nasabah', 'Customer'],
  col_date: ['Tanggal', 'Date'],
  col_time: ['Waktu', 'Time'],
  col_type: ['Jenis anomali', 'Anomaly type'],
  col_rows: ['Transaksi', 'Txns'],
  col_amount: ['Nominal', 'Amount'],
  col_pct: ['Persentil', 'Percentile'],
  col_severity: ['Severity', 'Severity'],
  col_category: ['Kategori', 'Category'],
  sev_high: ['High', 'High'],
  sev_medium: ['Medium', 'Medium'],
  drift_stable: ['Stabil', 'Stable'],
  drift_warning: ['Waspada', 'Warning'],
  drift_drifted: ['Bergeser', 'Drifted'],

  // period bar
  period_all: ['Mei–Jun 2026', 'May–Jun 2026'],
  period_may: ['Mei', 'May'],
  period_jun: ['Juni', 'June'],
  period_30: ['30 hari terakhir', 'Last 30 days'],
  period_7: ['7 hari terakhir', 'Last 7 days'],
  period_label: ['Periode', 'Period'],
  scope_note: ['Periode evaluasi model adalah Mei–Jun 2026 (validasi + uji). Skor pada bulan training (Feb–Apr 2026) bersifat in-sample.', 'The model evaluation period is May–Jun 2026 (validation + test). Scores in the training months (Feb–Apr 2026) are in-sample.'],

  // KPIs
  kpi_txn: ['Transaksi', 'Transactions'],
  kpi_txn_sub: ['{n} hari data', '{n} days of data'],
  kpi_alerts: ['Alert', 'Alerts'],
  kpi_alerts_sub: ['{p} dari transaksi', '{p} of transactions'],
  kpi_alerts_hint: ['Transaksi dengan persentil ≥ 99,5 di dalam segmennya. Target alert-rate sekitar 0,5%.', 'Transactions at or above the 99.5th percentile within their segment. Target alert rate is about 0.5%.'],
  kpi_high: ['Severity High', 'High severity'],
  kpi_high_sub: ['{n} per hari', '{n} per day'],
  kpi_cases: ['Kasus', 'Cases'],
  kpi_cases_sub: ['{n} kasus per hari', '{n} cases per day'],
  kpi_cases_hint: ['Satu kasus = satu nasabah pada satu hari. Satu insiden sering menghasilkan banyak baris alert.', 'One case = one customer on one day. A single incident often produces many alert rows.'],
  kpi_customers: ['Nasabah ter-flag', 'Flagged customers'],
  kpi_customers_sub: ['nasabah berbeda', 'distinct customers'],
  kpi_amount: ['Nilai ter-flag', 'Flagged value'],
  kpi_amount_sub: ['{p} dari total nilai', '{p} of total value'],
  kpi_amount_hint: ['Total nominal transaksi yang ter-flag. Ini BUKAN kerugian dan bukan nilai fraud terbukti.', 'Total amount of flagged transactions. This is NOT a loss and not proven fraud.'],

  // latest day
  ld_title: ['Hari Terakhir', 'Latest Day'],
  ld_desc: ['Hari terakhir yang datanya lengkap, dibanding rata-rata hari yang sama pada 4 minggu sebelumnya.', 'The latest day with complete data, compared with the average of the same weekday over the previous 4 weeks.'],
  ld_complete: ['Data lengkap', 'Complete'],
  ld_partial: ['Sebagian, sampai jam {h}:59', 'Partial, up to {h}:59'],
  ld_base_note: ['pembanding: {n} minggu', 'baseline: {n} weeks'],
  ld_vs_avg: ['vs rata-rata', 'vs average'],
  ld_low_volume: ['Data hari ini baru masuk sebagian dan volumenya jauh di bawah biasanya, sehingga selisih alert belum bermakna.', "Today's data has only partly arrived and volume is far below normal, so alert differences are not yet meaningful."],

  // overview
  ov_title: ['Ringkasan Deteksi Anomali', 'Anomaly Detection Overview'],
  ov_sub: ['Volume dan pola transaksi yang ditandai model sebagai tidak biasa pada periode terpilih.', 'Volume and patterns of transactions the model flagged as unusual in the selected period.'],
  ov_nolabel: ['Data tidak punya label fraud, jadi dashboard ini menampilkan volume dan pola anomali, bukan recall atau precision. Alert berarti "tidak biasa", bukan "terbukti fraud".', 'The data has no fraud labels, so this dashboard shows anomaly volume and patterns, not recall or precision. An alert means "unusual", not "proven fraud".'],
  ov_trend: ['Alert per hari', 'Alerts per day'],
  ov_trend_desc: ['Jumlah alert harian per tingkat severity.', 'Daily alerts by severity.'],
  ov_types: ['Jenis anomali', 'Anomaly types'],
  ov_types_desc: ['Pola yang paling menyumbang skor pada tiap alert.', "The pattern that contributes most to each alert's score."],
  ov_segments: ['Alert-rate per segmen', 'Alert rate per segment'],
  ov_segments_desc: ['Skor dikalibrasi per segmen; target {t}% di setiap segmen.', 'Scores are calibrated per segment; target is {t}% in each segment.'],
  ov_segments_note: ['Segmen kecil (EWALLET, OTHER; ratusan transaksi) berfluktuasi karena sampelnya sedikit.', 'Small segments (EWALLET, OTHER; a few hundred txns) fluctuate because of small samples.'],
  ov_target: ['target', 'target'],
  ov_alert_rate: ['Alert-rate', 'Alert rate'],
  ov_hours: ['Pola jam', 'Hourly pattern'],
  ov_hours_desc: ['Jumlah alert dan alert-rate menurut jam transaksi.', 'Alert count and alert rate by transaction hour.'],
  ov_categories: ['Per kategori transaksi', 'By transaction category'],
  ov_categories_desc: ['Batang = alert-rate relatif; angka = alert / total.', 'Bar = relative alert rate; number = alerts / total.'],
  ov_channels: ['Per kanal', 'By channel'],
  ov_channels_desc: ['Kode kanal apa adanya dari data.', 'Channel codes as they appear in the data.'],
  ov_top_cases: ['Kasus teratas', 'Top cases'],
  ov_top_cases_desc: ['Kasus dengan persentil tertinggi.', 'Cases with the highest percentile.'],
  ov_health: ['Kesehatan model', 'Model health'],
  ov_health_status: ['Status drift (Mei–Jun)', 'Drift status (May–Jun)'],
  ov_health_desc: ['Apakah perilaku transaksi masih mirip dengan data training.', 'Whether transaction behavior still resembles the training data.'],
  ov_review: ['Progres tinjauan', 'Review progress'],
  ov_review_done: ['Alert sudah ditinjau', 'Alerts reviewed'],
  coming_soon: ['Halaman ini menyusul', 'This page is coming'],

  // executive
  exec_title: ['Ringkasan Eksekutif', 'Executive Summary'],
  exec_sub: ['Gambaran untuk manajemen: beban kerja analis, pola anomali, dan kesehatan model.', 'Overview for management: analyst workload, anomaly patterns, and model health.'],
  exec_hero_label: ['Beban kerja analis', 'Analyst workload'],
  exec_cases_day: ['kasus / hari', 'cases / day'],
  exec_hero_sub: ['{alerts} baris alert per hari, {high} di antaranya severity High.', '{alerts} alert rows per day, {high} of them High severity.'],
  exec_amount_sub: ['nilai transaksi yang ditandai', 'value of flagged transactions'],
  exec_health: ['Kesehatan model', 'Model health'],
  exec_health_sub: ['Pergeseran perilaku dibanding data training.', 'Behavior shift compared with training data.'],
  exec_weekly: ['Tren mingguan', 'Weekly trend'],
  exec_weekly_desc: ['Alert per minggu menurut severity.', 'Alerts per week by severity.'],
  exec_insights: ['Sorotan', 'Highlights'],
  exec_types: ['Pola anomali teratas', 'Top anomaly patterns'],
  exec_types_desc: ['Porsi tiap jenis anomali dari seluruh alert.', 'Share of each anomaly type among all alerts.'],
  exec_share: ['Porsi', 'Share'],
  exec_top_cases: ['Kasus yang perlu perhatian', 'Cases needing attention'],
  exec_top_cases_desc: ['Lima kasus dengan skor tertinggi.', 'The five highest-scoring cases.'],
  exec_limits_t: ['Cara membaca angka ini.', 'How to read these numbers.'],
  exec_limits_b: ['Sistem mendeteksi transaksi yang tidak biasa tanpa label fraud. Angka di sini adalah volume alert dan beban kerja, bukan kerugian yang dicegah atau fraud yang terbukti. Tingkat konfirmasi sebenarnya baru dapat diukur setelah analis meninjau alert.', 'The system detects unusual transactions without fraud labels. These numbers are alert volume and workload, not prevented losses or proven fraud. The true confirmation rate can only be measured after analysts review alerts.'],
  ins_workload_t: ['Beban kerja', 'Workload'],
  ins_workload_b: ['Rata-rata {cases} kasus ({alerts} baris alert) per hari, {high} baris severity High.', 'On average {cases} cases ({alerts} alert rows) per day, {high} High-severity rows.'],
  ins_top_type_t: ['Pola dominan', 'Dominant pattern'],
  ins_top_type_b: ['"{label}" menyumbang {share}% dari seluruh alert.', '"{label}" accounts for {share}% of all alerts.'],
  ins_concentration_t: ['Konsentrasi nasabah', 'Customer concentration'],
  ins_concentration_b: ['Lima nasabah teratas menyumbang {share}% alert (dari {n} nasabah ter-flag). Konsentrasi tinggi berarti satu insiden bisa mendominasi antrean.', 'The top five customers account for {share}% of alerts (out of {n} flagged customers). High concentration means one incident can dominate the queue.'],
  ins_peak_day_t: ['Hari tersibuk', 'Busiest day'],
  ins_peak_day_b: ['{date} memiliki {n} baris alert.', '{date} had {n} alert rows.'],
  ins_segment_over_t: ['Segmen di atas target', 'Segment above target'],
  ins_segment_over_b: ['Segmen {segments} memiliki alert-rate {rate}% (target {target}%). Periksa apakah ada perubahan perilaku pada segmen itu.', 'Segment(s) {segments} have an alert rate of {rate}% (target {target}%). Check whether behavior changed in that segment.'],
  ins_drift_t: ['Status drift', 'Drift status'],
  ins_drift_b: ['Status drift periode evaluasi: {status}. Lihat Drift Monitor untuk fitur yang bergeser.', 'Drift status for the evaluation period: {status}. See Drift Monitor for the features that shifted.'],

  // data glance
  dg_title: ['Sekilas Data', 'Data at a Glance'],
  dg_txn: ['Transaksi', 'Transactions'],
  dg_customers: ['Nasabah', 'Customers'],
  dg_range: ['Rentang data', 'Data range'],
  dg_columns: ['Kolom data', 'Data columns'],
  dg_train: ['Periode training', 'Training period'],
  dg_test: ['Periode uji', 'Test period'],
  dg_note: ['Alert hanya bermakna pada periode uji; periode training dipakai model untuk belajar pola normal.', 'Alerts are only meaningful in the test period; the training period is where the model learns normal patterns.'],
  dg_val: ['Validasi: {r}.', 'Validation: {r}.'],

  // live stream
  ls_title: ['Pemantauan Live', 'Live Monitoring'],
  ls_sub: ['Memutar ulang transaksi Juni 2026 berurutan waktu. Skor berasal dari model yang sama dengan halaman lain.', 'Replays June 2026 transactions in time order. Scores come from the same model as the other pages.'],
  ls_connected: ['Terhubung (simulasi)', 'Connected (simulated)'],
  ls_play: ['Putar', 'Play'],
  ls_pause: ['Jeda', 'Pause'],
  ls_reset: ['Ulang', 'Reset'],
  ls_next_alert: ['Alert berikutnya', 'Next alert'],
  ls_speed: ['Kecepatan', 'Speed'],
  ls_autopause: ['Jeda otomatis saat High', 'Auto-pause on High'],
  ls_autopaused: ['Dijeda otomatis: alert High masuk.', 'Auto-paused: a High alert arrived.'],
  ls_processed: ['Diproses', 'Processed'],
  ls_alert_rate: ['alert-rate {p}%', 'alert rate {p}%'],
  ls_progress: ['Progres', 'Progress'],
  ls_chart: ['Persentil skor (real-time)', 'Score percentile (real-time)'],
  ls_chart_desc: ['160 transaksi terakhir. Garis oranye = ambang alert, merah = ambang High.', 'Last 160 transactions. Orange line = alert threshold, red = High threshold.'],
  ls_alerts: ['Alert masuk', 'Incoming alerts'],
  ls_alerts_desc: ['Alert terbaru di paling atas.', 'Newest alerts on top.'],
  ls_no_alerts: ['Belum ada alert', 'No alerts yet'],
  ls_no_alerts_desc: ['Tekan Putar, atau lompat ke alert berikutnya.', 'Press Play, or jump to the next alert.'],
  ls_feed: ['Arus transaksi', 'Transaction feed'],
  ls_feed_empty: ['Tekan Putar untuk mulai memutar ulang transaksi.', 'Press Play to start replaying transactions.'],
  ls_highlights: ['Kasus sorotan', 'Highlighted cases'],
  ls_highlights_desc: ['Alert tertinggi untuk tiap jenis anomali bulan Juni, dipilih otomatis dari data.', 'Top alert per anomaly type in June, picked automatically from the data.'],
  ls_hl_count: ['{n} alert pada jenis ini', '{n} alerts of this type'],
  ls_play_from: ['Putar dari sini', 'Play from here'],

  // shared (action & retention)
  col_reason: ['Alasan utama', 'Main reason'],
  col_review: ['Tinjauan', 'Review'],
  sev_low: ['Pantau', 'Watch'],
  dec_confirmed: ['Terkonfirmasi mencurigakan', 'Confirmed suspicious'],
  dec_dismissed: ['Wajar / ditolak', 'Dismissed (normal)'],
  dec_escalate: ['Eskalasi', 'Escalate'],
  prev: ['Sebelumnya', 'Previous'],
  next: ['Berikutnya', 'Next'],
  page: ['Halaman {p} dari {n}', 'Page {p} of {n}'],

  // alert queue
  aq_title: ['Antrian Alert', 'Alert Queue'],
  aq_sub: ['Seluruh transaksi yang ditandai, dapat difilter, dikelompokkan per kasus, dan ditinjau.', 'All flagged transactions: filter, group by case, and review.'],
  aq_src_all: ['Semua alert', 'All alerts'],
  aq_src_pending: ['Belum ditinjau', 'Not yet reviewed'],
  aq_src_queue: ['Antrean review', 'Review queue'],
  aq_src_reviewed: ['Sudah ditinjau', 'Reviewed'],
  aq_src_watch: ['Daftar pantau', 'Watchlist'],
  aq_source: ['Sumber data', 'Source'],
  aq_view: ['Tampilan', 'View'],
  aq_view_row: ['Per transaksi', 'By transaction'],
  aq_view_case: ['Per kasus', 'By case'],
  aq_all_sev: ['Semua severity', 'All severities'],
  aq_all_types: ['Semua jenis', 'All types'],
  aq_all_categories: ['Semua kategori', 'All categories'],
  aq_search: ['Cari ID, nasabah, kasus…', 'Search ID, customer, case…'],
  aq_total: ['{n} data', '{n} records'],
  aq_empty: ['Tidak ada data', 'No data'],
  aq_empty_desc: ['Ubah filter atau periode.', 'Change the filters or period.'],
  aq_empty_queue: ['Antrean kosong. Kirim kasus dari Daily Review.', 'The queue is empty. Send cases from Daily Review.'],
  aq_undecided: ['belum', 'pending'],
  aq_reviewed: ['Ditinjau', 'Reviewed'],
  aq_dequeue: ['Keluarkan dari antrean', 'Remove from queue'],
  aq_queue_note: ['Antrean review berlaku selama sesi ini saja (mockup, belum tersimpan di server).', 'The review queue only lasts for this session (mockup, not stored on a server).'],

  // daily review
  dr_title: ['Daily Review (D-1)', 'Daily Review (D-1)'],
  dr_sub: ['Tinjauan harian: kasus teratas, pola, dan nasabah yang berulang muncul. Dibandingkan dengan rata-rata 7 hari sebelumnya.', 'Daily review: top cases, patterns, and repeat customers. Compared with the previous 7-day average.'],
  dr_days: ['Daftar hari', 'Days'],
  dr_alerts_short: ['alert', 'alerts'],
  dr_vs_avg: ['rata-rata 7 hari: {avg} ({x}x)', '7-day average: {avg} ({x}x)'],
  dr_no_baseline: ['tanpa pembanding 7 hari', 'no 7-day baseline'],
  dr_customers: ['{n} nasabah', '{n} customers'],
  dr_types: ['Jenis anomali hari ini', 'Anomaly types today'],
  dr_no_alerts: ['Tidak ada alert pada hari ini', 'No alerts today'],
  dr_hourly: ['Alert per jam', 'Alerts per hour'],
  dr_cases: ['Kasus hari ini', "Today's cases"],
  dr_cases_desc: ['Diurutkan dari skor tertinggi. "Tindaklanjuti" memasukkan ke antrean review.', 'Sorted by highest score. "Follow up" adds it to the review queue.'],
  dr_follow_up: ['Tindaklanjuti', 'Follow up'],
  dr_queued: ['Di antrean', 'Queued'],
  dr_repeat: ['Nasabah berulang', 'Repeat customers'],
  dr_repeat_desc: ['Ter-flag hari ini dan juga pada hari-hari sebelumnya dalam 7 hari terakhir.', 'Flagged today and also on earlier days within the last 7 days.'],
  dr_no_repeat: ['Tidak ada nasabah berulang.', 'No repeat customers.'],
  dr_today: ['Alert hari ini', 'Alerts today'],
  dr_prev_days: ['Hari ter-flag (7 hari lalu)', 'Flagged days (previous 7)'],

  // analyst review
  ra_title: ['Review Analis', 'Analyst Review'],
  ra_sub: ['Hasil tinjauan analis atas alert: seberapa banyak yang dikonfirmasi, per jenis anomali dan severity.', 'Analyst review results on alerts: how many are confirmed, by anomaly type and severity.'],
  ra_how_t: ['Tanpa retrain otomatis.', 'No automatic retraining.'],
  ra_how_b: ['Keputusan analis disimpan untuk mengukur seberapa sering alert benar-benar dianggap mencurigakan. Ini satu-satunya ukuran "ketepatan" yang nyata, dan dapat diekspor sebagai calon label untuk model supervised di masa depan.', 'Analyst decisions are stored to measure how often alerts are actually judged suspicious. This is the only real measure of "precision", and it can be exported as candidate labels for a future supervised model.'],
  ra_reviewed: ['Ditinjau', 'Reviewed'],
  ra_reviewed_sub: ['{p} dari alert', '{p} of alerts'],
  ra_pending: ['Belum ditinjau', 'Pending'],
  ra_queue: ['{n} di antrean review', '{n} in the review queue'],
  ra_by_type: ['Tingkat konfirmasi per jenis anomali', 'Confirmation rate by anomaly type'],
  ra_by_type_desc: ['Terkonfirmasi / (terkonfirmasi + ditolak). Jenis dengan tingkat konfirmasi rendah mungkin perlu ambang atau fitur yang diperbaiki.', 'Confirmed / (confirmed + dismissed). Types with a low confirmation rate may need threshold or feature tuning.'],
  ra_confirm_rate: ['Tingkat konfirmasi', 'Confirmation rate'],
  ra_rate_note: ['Angka baru bermakna setelah cukup banyak alert ditinjau; saat sedikit, anggap sebagai indikasi awal.', 'The figures become meaningful only after enough alerts are reviewed; with few, treat them as early indications.'],
  ra_by_sev: ['Per severity', 'By severity'],
  ra_recent: ['Keputusan terbaru', 'Recent decisions'],
  ra_export: ['Ekspor CSV', 'Export CSV'],
  ra_empty: ['Belum ada tinjauan', 'No reviews yet'],
  ra_analyst: ['Analis', 'Analyst'],
  ra_when: ['Waktu', 'When'],
  ra_note: ['Catatan', 'Note'],
} satisfies Record<string, Entry>;

export type TextKey = keyof typeof T;

const TYPE_LABEL: Record<AnomalyType, Entry> = {
  SOCIAL_ENGINEERING: ['Indikasi social engineering', 'Social engineering indication'],
  PENERIMA_BARU: ['Penerima baru / banyak penerima', 'New / many recipients'],
  PENYIMPANGAN_KEBIASAAN: ['Menyimpang dari kebiasaan', 'Deviates from habit'],
  NOMINAL_TIDAK_WAJAR: ['Nominal tidak wajar', 'Unusual amount'],
  LONJAKAN_FREKUENSI: ['Lonjakan frekuensi', 'Velocity spike'],
  KEGAGALAN_BERULANG: ['Kegagalan berulang', 'Repeated failures'],
  NOMINAL_BERULANG: ['Nominal identik berulang', 'Repeated identical amount'],
  PENAMPUNG_FANIN: ['Indikasi penampung (fan-in)', 'Collector indication (fan-in)'],
  WAKTU_TIDAK_BIASA: ['Waktu tidak biasa', 'Unusual time'],
  PERANGKAT_BERBAGI: ['Perangkat baru / dipakai bersama', 'New / shared device'],
  KONDISI_SISTEM: ['Kondisi sistem / kanal', 'System / channel condition'],
  AKTIVITAS_NON_FINANSIAL: ['Aktivitas non-finansial', 'Non-financial activity'],
  DATA_TIDAK_VALID: ['Data tidak valid', 'Invalid data'],
  CAMPURAN: ['Campuran', 'Mixed'],
};

// Main-reason templates per anomaly type; {a} and {b} are filled with numbers per alert.
const REASON: Record<AnomalyType, Entry> = {
  SOCIAL_ENGINEERING: ['Penerima pertama kali dengan nominal {a}x rata-rata pribadi 30 hari', 'First-ever recipient with an amount {a}x the 30-day personal average'],
  PENERIMA_BARU: ['Penerima baru; {b} penerima berbeda dalam 1 jam', 'New recipient; {b} distinct recipients in 1 hour'],
  PENYIMPANGAN_KEBIASAAN: ['Nominal {a}x rata-rata pribadi 30 hari', 'Amount {a}x the 30-day personal average'],
  NOMINAL_TIDAK_WAJAR: ['Nominal di atas persentil 99 nasabah selama 90 hari ({a}x median)', "Amount above the customer's 99th percentile over 90 days ({a}x median)"],
  LONJAKAN_FREKUENSI: ['{a} transaksi dalam 15 menit, biasanya {b} per hari', '{a} transactions in 15 minutes, usually {b} per day'],
  KEGAGALAN_BERULANG: ['{b} transaksi gagal dalam 1 jam lalu berhasil', '{b} failed transactions in 1 hour, then a success'],
  NOMINAL_BERULANG: ['Nominal identik {b}x dalam 10 menit', 'Identical amount {b}x in 10 minutes'],
  PENAMPUNG_FANIN: ['Rekening tujuan menerima dari {a} pengirim berbeda dalam 24 jam', 'Destination account received from {a} different payers in 24 hours'],
  WAKTU_TIDAK_BIASA: ['Transaksi dini hari, {b} jam di luar jam kebiasaan nasabah', 'Early-morning transaction, {b} hours outside the usual hours'],
  PERANGKAT_BERBAGI: ['Perangkat dipakai {b} akun berbeda dalam 30 hari', 'Device used by {b} different accounts in 30 days'],
  KONDISI_SISTEM: ['Lonjakan gagal pada kanal ({a}% dalam 1 jam)', 'Channel failure spike ({a}% in 1 hour)'],
  AKTIVITAS_NON_FINANSIAL: ['{a} aktivitas non-finansial dalam 24 jam', '{a} non-financial activities in 24 hours'],
  DATA_TIDAK_VALID: ['Nominal nol atau negatif', 'Zero or negative amount'],
  CAMPURAN: ['Kombinasi beberapa sinyal lemah (tidak ada pola dominan)', 'A mix of weak signals (no dominant pattern)'],
};

const WEEKDAY: Entry[] = [
  ['Minggu', 'Sunday'], ['Senin', 'Monday'], ['Selasa', 'Tuesday'], ['Rabu', 'Wednesday'],
  ['Kamis', 'Thursday'], ['Jumat', 'Friday'], ['Sabtu', 'Saturday'],
];

/** Text helper bound to the current UI language. `{name}` placeholders are filled from params. */
export function useFg() {
  const { lang } = useI18n();
  const li = lang === 'en' ? 1 : 0;
  const tr = (key: TextKey, params?: Record<string, string | number>) => {
    let s = T[key][li];
    if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
  const typeName = (code: AnomalyType) => TYPE_LABEL[code][li];
  const reason = (r: { type: AnomalyType; a: number; b: number }) =>
    REASON[r.type][li].replaceAll('{a}', String(r.a)).replaceAll('{b}', String(r.b));
  const weekday = (d: number) => WEEKDAY[d][li];
  const locale = lang === 'en' ? 'en-US' : 'id-ID';
  return { tr, typeName, reason, weekday, lang, locale };
}
