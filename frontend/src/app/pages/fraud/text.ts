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
  const weekday = (d: number) => WEEKDAY[d][li];
  const locale = lang === 'en' ? 'en-US' : 'id-ID';
  return { tr, typeName, weekday, lang, locale };
}
