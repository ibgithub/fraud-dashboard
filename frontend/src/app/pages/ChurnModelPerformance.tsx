import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Loader2, Database, CheckCircle2, Award, Target, AlertTriangle, Activity } from 'lucide-react';

interface ModelCompare {
  model: string;
  auc: number | null;
  f1: number | null;
  precision: number | null;
  recall: number | null;
  accuracy: number | null;
  selected: boolean;
}

interface ChurnModelPerformanceData {
  accuracy: string;
  precision: string;
  recall: string;
  missedRate: string;
  aucRoc: string;
  f1?: string;
  totalAnalyzed: number;
  scoreDistribution: Array<{ range: string; count: number }>;
  tp?: number | null;
  fp?: number | null;
  fn?: number | null;
  tn?: number | null;
  modelName?: string | null;
  modelLibrary?: string | null;
  split?: string | null;
  featureWindowMonths?: number | null;
  outcomeWindowMonths?: number | null;
  modelComparison?: ModelCompare[] | null;
}

const BAR_COLORS = ['#0E7490', '#0E7490', '#8A6534', '#8A6534', '#DC2626'];

export function ChurnModelPerformance() {
  const { lang } = useI18n();
  const [data, setData] = useState<ChurnModelPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/v1/executive/churn/model-performance', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            setData(body.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch churn model performance:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const numLocale = lang === 'id' ? 'id-ID' : 'en-US';
  const accuracy = data?.accuracy ?? '-';
  const precision = data?.precision ?? '-';
  const recall = data?.recall ?? '-';
  const missedRate = data?.missedRate ?? '-';
  const aucRoc = data?.aucRoc ?? '-';
  const f1 = data?.f1 ?? '-';
  const totalAnalyzed = data?.totalAnalyzed ?? 0;
  const scoreDist = data?.scoreDistribution ?? [];

  // Confusion matrix (real counts from ml_eva).
  const tp = data?.tp ?? null;
  const fp = data?.fp ?? null;
  const fn = data?.fn ?? null;
  const tn = data?.tn ?? null;
  const fmtN = (v: number | null) => (v == null ? '-' : v.toLocaleString(numLocale));

  // Model metadata banner.
  const modelName = data?.modelName ?? null;
  const modelLibrary = data?.modelLibrary ?? null;
  const featW = data?.featureWindowMonths ?? null;
  const outW = data?.outcomeWindowMonths ?? null;
  const modelComparison = data?.modelComparison ?? [];

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'id' ? 'Performa Model — Churn' : 'Model Performance — Churn'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'id'
              ? 'Indikator performa, confusion matrix & distribusi skor model Machine Learning Churn.'
              : 'Performance indicators, confusion matrix & score distribution for the Churn ML model.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 text-[#8A6534] animate-spin" />}
        </div>
      </div>

      {/* Database Schema Metadata Banner (real values from ml_eva.churn_model_info) */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-3 shadow-2xs">
        <Database className="w-4 h-4 text-[#8A6534] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900">
            {lang === 'id' ? 'Sumber Database: ml_eva (bag_demo)' : 'Database Source: ml_eva (bag_demo)'}
          </span>
          <p className="mt-0.5 text-slate-500 leading-relaxed">
            {`${lang === 'id' ? 'Model' : 'Model'}: ${modelName ?? '-'}${modelLibrary ? ` (${modelLibrary})` : ''} | AUC-ROC: ${aucRoc} | F1: ${f1} | ${lang === 'id' ? 'Total Teranalisis' : 'Total Analyzed'}: ${totalAnalyzed.toLocaleString(numLocale)}${featW != null && outW != null ? ` | ${lang === 'id' ? 'Jendela Fitur/Outcome' : 'Feature/Outcome Window'}: ${featW}/${outW} ${lang === 'id' ? 'bln' : 'mo'}` : ''}.`}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={lang === 'id' ? 'Akurasi Validasi' : 'Validation Accuracy'} value={accuracy} sub={lang === 'id' ? 'Tingkat keakuratan global' : 'Global accuracy rate'} icon={Award} />
        <KpiCard label={lang === 'id' ? 'Presisi (Hi Churn)' : 'Precision (Hi Churn)'} value={precision} sub={lang === 'id' ? 'Ketetapan prediksi churn' : 'Churn prediction precision'} icon={Target} />
        <KpiCard label={lang === 'id' ? 'Recall (Hi Churn)' : 'Recall (Hi Churn)'} value={recall} sub={lang === 'id' ? 'Daya tangkap nasabah churn' : 'Churn capture rate'} icon={Activity} />
        <KpiCard label={lang === 'id' ? 'Prediksi Meleset' : 'Missed Predictions'} value={missedRate} sub={lang === 'id' ? 'Rasio false negative' : 'False negative ratio'} icon={AlertTriangle} />
      </div>

      {/* Chart + Confusion Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score distribution bar chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            {lang === 'id' ? 'Distribusi Skor Kepercayaan Churn' : 'Churn Confidence Score Distribution'}
          </h3>
          <p className="text-xs text-slate-400 mb-4 font-medium">
            {lang === 'id'
              ? `Jumlah nasabah terbagi dalam 5 rentang skor (Total teranalisis: ${totalAnalyzed.toLocaleString('id-ID')})`
              : `Customer count across 5 score ranges (Total analyzed: ${totalAnalyzed.toLocaleString('en-US')})`}
          </p>

          <div className="pt-2">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scoreDist}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="range" fontSize={11} stroke="#64748B" />
                <YAxis fontSize={11} stroke="#64748B" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(v: number) => [v.toLocaleString('id-ID') + ' nasabah', 'Jumlah']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={42}>
                  {scoreDist.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confusion Matrix Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                {lang === 'id' ? 'Confusion Matrix' : 'Confusion Matrix'}
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">ml_eva.churn_confusion_matrix</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs mt-3">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                <p className="text-[10px] font-bold text-emerald-700 uppercase">True Positive (TP)</p>
                <p className="text-lg font-black text-emerald-900 mt-1">{fmtN(tp)}</p>
                <p className="text-[10px] text-emerald-600 font-medium">{lang === 'id' ? 'Tepat Churn' : 'Correct Churn'}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <p className="text-[10px] font-bold text-amber-700 uppercase">False Positive (FP)</p>
                <p className="text-lg font-black text-amber-900 mt-1">{fmtN(fp)}</p>
                <p className="text-[10px] text-amber-600 font-medium">{lang === 'id' ? 'Salah Alarm' : 'False Alarm'}</p>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg">
                <p className="text-[10px] font-bold text-rose-700 uppercase">False Negative (FN)</p>
                <p className="text-lg font-black text-rose-900 mt-1">{fmtN(fn)}</p>
                <p className="text-[10px] text-rose-600 font-medium">{lang === 'id' ? 'Lolos Meleset' : 'Missed'}</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                <p className="text-[10px] font-bold text-slate-700 uppercase">True Negative (TN)</p>
                <p className="text-lg font-black text-slate-900 mt-1">{fmtN(tn)}</p>
                <p className="text-[10px] text-slate-600 font-medium">{lang === 'id' ? 'Tepat Retain' : 'Correct Retain'}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 font-medium">
            <div className="flex items-center justify-between">
              <span>AUC-ROC Score</span>
              <span className="font-extrabold text-slate-900">{aucRoc}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>F1-Score</span>
              <span className="font-extrabold text-slate-900">{f1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Comparison (ml_eva.model_experiment_comparison) */}
      {modelComparison.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">
              {lang === 'id' ? 'Perbandingan Model' : 'Model Comparison'}
            </h3>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">ml_eva.model_experiment_comparison</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="text-left font-bold py-2 pr-3">Model</th>
                  <th className="text-right font-bold py-2 px-3">AUC</th>
                  <th className="text-right font-bold py-2 px-3">F1</th>
                  <th className="text-right font-bold py-2 px-3">Precision</th>
                  <th className="text-right font-bold py-2 px-3">Recall</th>
                  <th className="text-right font-bold py-2 pl-3">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {modelComparison.map((m, i) => {
                  const fmt = (v: number | null) => (v == null ? '-' : v.toLocaleString(numLocale, { minimumFractionDigits: 4, maximumFractionDigits: 4 }));
                  return (
                    <tr key={i} className={`border-b border-slate-100 ${m.selected ? 'bg-[#8A6534]/5' : ''}`}>
                      <td className="py-2 pr-3 font-semibold text-slate-800">
                        {m.model}
                        {m.selected && (
                          <span className="ml-2 text-[10px] font-bold text-[#8A6534] bg-[#8A6534]/10 border border-[#8A6534]/20 px-1.5 py-0.5 rounded">
                            {lang === 'id' ? 'Terpilih' : 'Selected'}
                          </span>
                        )}
                      </td>
                      <td className="text-right py-2 px-3 tabular-nums text-slate-700">{fmt(m.auc)}</td>
                      <td className="text-right py-2 px-3 tabular-nums text-slate-700">{fmt(m.f1)}</td>
                      <td className="text-right py-2 px-3 tabular-nums text-slate-700">{fmt(m.precision)}</td>
                      <td className="text-right py-2 px-3 tabular-nums text-slate-700">{fmt(m.recall)}</td>
                      <td className="text-right py-2 pl-3 tabular-nums text-slate-700">{fmt(m.accuracy)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: any }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 border-l-4 border-l-[#8A6534] shadow-2xs relative">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <Icon className="w-4 h-4 text-[#8A6534]" />
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500 mt-1 font-medium">{sub}</p>
    </div>
  );
}
