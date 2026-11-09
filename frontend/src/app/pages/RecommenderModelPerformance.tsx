import { useI18n } from '../i18n';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Database, Award, Zap, Target, Activity, Clock } from 'lucide-react';

const RECOMMENDER_EVAL_DATA = [
  { k: 1, precision: 0.89, recall: 0.32, ndcg: 0.94 },
  { k: 2, precision: 0.87, recall: 0.48, ndcg: 0.93 },
  { k: 3, precision: 0.86, recall: 0.61, ndcg: 0.92 },
  { k: 4, precision: 0.85, recall: 0.72, ndcg: 0.915 },
  { k: 5, precision: 0.842, recall: 0.796, ndcg: 0.912 },
  { k: 6, precision: 0.81, recall: 0.83, ndcg: 0.895 },
  { k: 7, precision: 0.78, recall: 0.86, ndcg: 0.88 },
  { k: 8, precision: 0.75, recall: 0.88, ndcg: 0.865 },
  { k: 9, precision: 0.72, recall: 0.89, ndcg: 0.85 },
  { k: 10, precision: 0.69, recall: 0.91, ndcg: 0.835 },
];

export function RecommenderModelPerformance() {
  const { lang } = useI18n();

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'id' ? 'Performa Model — Sistem Rekomendasi' : 'Model Performance — Recommender System'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'id'
              ? 'Evaluasi akurasi rekomendasi produk perbankan. Integrasi database evaluasi model masih dalam proses.'
              : 'Banking product recommendation accuracy evaluation. Model evaluation database integration is in progress.'}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
          <Clock className="w-3.5 h-3.5" />
          In Progress
        </span>
      </div>

      {/* Metadata Banner — pending backend integration */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3 shadow-2xs">
        <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-900">
            {lang === 'id' ? 'Modul Evaluasi Model Rekomendasi [In Progress]' : 'Recommender Model Evaluation Module [In Progress]'}
          </span>
          <p className="mt-0.5 text-amber-700 leading-relaxed">
            {lang === 'id'
              ? 'Metrik evaluasi model sistem rekomendasi belum tersedia di database. Angka di bawah adalah placeholder pratinjau.'
              : 'Recommender system model evaluation metrics are not yet available in the database. The figures below are preview placeholders.'}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="MAP@5 (Mean Avg Precision)" value="87.5%" sub={lang === 'id' ? 'Tingkat presisi urutan' : 'Ranking precision rate'} icon={Award} inProgress />
        <KpiCard label="NDCG@5 (Discounted Gain)" value="0.912" sub={lang === 'id' ? 'Skor relevansi posisi top' : 'Top position relevance score'} icon={Zap} inProgress />
        <KpiCard label="Hit Rate @ 5" value="92.4%" sub={lang === 'id' ? 'Rasio rekomendasi relevan' : 'Relevant recommendation ratio'} icon={Target} inProgress />
        <KpiCard label={lang === 'id' ? 'Cakupan Katalog' : 'Catalog Coverage'} value="88.6%" sub={lang === 'id' ? 'Variasi produk terekomendasi' : 'Recommended product variety'} icon={Activity} inProgress />
      </div>

      {/* Precision / Recall @ k Line Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {lang === 'id' ? 'Evaluasi Precision@k, Recall@k, & NDCG@k (k=1..10)' : 'Precision@k, Recall@k, & NDCG@k Evaluation (k=1..10)'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {lang === 'id' ? 'Trade-off antara presisi urutan dan kelengkapan rekomendasi produk' : 'Trade-off between ranking precision and recommendation completeness'}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 shrink-0">
            <Clock className="w-3 h-3" />
            In Progress
          </span>
        </div>

        <div className="pt-2">
          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={RECOMMENDER_EVAL_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="k" fontSize={11} stroke="#64748B" label={{ value: 'Top k Product Recommendations', position: 'insideBottomRight', offset: -5 }} />
              <YAxis domain={[0, 1]} fontSize={11} stroke="#64748B" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
              <Legend verticalAlign="bottom" height={36} />
              <Line type="monotone" dataKey="ndcg" name="NDCG@k" stroke="#8A6534" strokeWidth={2.5} />
              <Line type="monotone" dataKey="precision" name="Precision@k" stroke="#0E7490" strokeWidth={2.5} />
              <Line type="monotone" dataKey="recall" name="Recall@k" stroke="#7C3AED" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, inProgress }: { label: string; value: string; sub: string; icon: any; inProgress?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 border-l-4 border-l-[#8A6534] shadow-2xs relative">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <Icon className="w-4 h-4 text-[#8A6534]" />
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {inProgress ? (
        <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
          <Clock className="w-3 h-3" />
          In Progress
        </span>
      ) : (
        <p className="text-[11px] text-slate-500 mt-1 font-medium">{sub}</p>
      )}
    </div>
  );
}
