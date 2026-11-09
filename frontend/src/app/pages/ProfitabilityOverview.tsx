import { useI18n } from '../i18n';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const MONTHS = ['Ags', 'Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'];
const TREND_DATA = MONTHS.map((m, i) => ({
  month: m,
  profit: 1200 + i * 90 + Math.round(Math.sin(i) * 80),
}));

const BRANCH_PROFIT = [
  { name: 'Jakarta Pusat', value: 4200 },
  { name: 'Bandung', value: 3400 },
  { name: 'Surabaya', value: 2600 },
  { name: 'Medan', value: 2900 },
  { name: 'Denpasar', value: 3800 },
];

const PIE_COLORS = ['#1F3864', '#B4522E', '#1D9E75', '#BA7517', '#5B8FC7'];

export function ProfitabilityOverview() {
  const { lang } = useI18n();

  return (
    <div className="px-6 pt-3 pb-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {lang === 'id' ? 'Ringkasan Profitabilitas' : 'Profitability Overview'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {lang === 'id'
            ? 'Gambaran kontribusi profit portofolio.'
            : 'Overview of portfolio profit contribution.'}
        </p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Line chart - Trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">
            {lang === 'id' ? 'Tren total profitability nasional' : 'National total profitability trend'}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {lang === 'id' ? '12 bulan terakhir' : 'Last 12 months'}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={TREND_DATA}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis tickFormatter={(v) => `Rp ${v}jt`} fontSize={11} />
              <Tooltip formatter={(v: number) => `Rp ${v} jt`} />
              <Line type="monotone" dataKey="profit" stroke="#B4522E" strokeWidth={2} fill="rgba(180,82,46,0.08)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart - per cabang */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">
            {lang === 'id' ? 'Profitability per cabang' : 'Profitability per branch'}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {lang === 'id' ? '12 bulan terakhir' : 'Last 12 months'}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={BRANCH_PROFIT} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                {BRANCH_PROFIT.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `Rp ${v} jt`} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
