import { useI18n } from '../i18n';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MONTHS = ['Ags', 'Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'];
const PREDICTION_DATA = MONTHS.map((m, i) => ({
  month: m,
  actual: 1200 + i * 90,
  predicted: 1200 + i * 90 + Math.round(Math.sin(i) * 60),
}));

export function ProfitabilityModelPerformance() {
  const { lang } = useI18n();

  return (
    <div className="px-6 pt-3 pb-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {lang === 'id' ? 'Performa Model — Profitabilitas' : 'Model Performance — Profitability'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {lang === 'id'
            ? 'Indikator kualitas Profitability Index (error prediksi, jendela 6 bulan ke depan).'
            : 'Profitability Index quality indicator (prediction error, 6-month forward window).'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="MAPE" value="9.4%" accent="good" />
        <KpiCard label="R²" value="0.86" />
        <KpiCard label="Bias" value="+1.2%" />
        <KpiCard label={lang === 'id' ? 'Jendela prediksi' : 'Prediction window'} value={lang === 'id' ? '6 bln' : '6 mo'} />
      </div>

      {/* Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">
          {lang === 'id' ? 'Prediksi vs aktual (Rp jt)' : 'Predicted vs actual (Rp M)'}
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          {lang === 'id'
            ? 'Dilatih terakhir: 28 Jul 2026 · jendela data: 12 bulan'
            : 'Last trained: 28 Jul 2026 · data window: 12 months'}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={PREDICTION_DATA}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={11} />
            <YAxis tickFormatter={(v) => `Rp ${v}jt`} fontSize={11} />
            <Tooltip formatter={(v: number) => `Rp ${v} jt`} />
            <Legend verticalAlign="bottom" height={36} />
            <Line type="monotone" dataKey="actual" name={lang === 'id' ? 'Aktual' : 'Actual'} stroke="#1F3864" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="predicted" name={lang === 'id' ? 'Prediksi' : 'Predicted'} stroke="#B4522E" strokeWidth={2} strokeDasharray="5 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: 'good' | 'warn' }) {
  const valueColor = accent === 'good' ? 'text-emerald-600' : accent === 'warn' ? 'text-amber-600' : 'text-slate-900';
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
