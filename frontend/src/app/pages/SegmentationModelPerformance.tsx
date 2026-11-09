import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Layers, Cpu, AlertTriangle, Users, Clock, Loader2 } from 'lucide-react';

interface KRow {
  k: number;
  silhouette: number | null;
  daviesBouldin: number | null;
  calinskiHarabasz: number | null;
  inertia: number | null;
  porsiMin: number | null;
}

interface ModelPerfData {
  model: string;
  optimalK: number | null;
  optimalDbi: number | null;
  optimalSilhouette: number | null;
  optimalCalinski: number | null;
  totalCustomers: number | null;
  perK: KRow[];
}

export function SegmentationModelPerformance() {
  const { lang } = useI18n();
  const [data, setData] = useState<ModelPerfData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/v1/executive/segmentation/bag-overview/model-performance', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) setData(body.data);
        }
      } catch (err) {
        console.error('Failed to fetch segmentation model performance:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const numLocale = lang === 'id' ? 'id-ID' : 'en-US';
  const num = (v: number | null | undefined, digits = 2) =>
    v === null || v === undefined ? '-' : v.toLocaleString(numLocale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

  const perK = data?.perK ?? [];
  const dbiData = perK.map((r) => ({ k: r.k, dbi: r.daviesBouldin ?? 0 }));
  const optimalK = data?.optimalK ?? null;
  const totalCustomers = data?.totalCustomers;

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'id' ? 'Performa Model — Segmentasi' : 'Model Performance — Segmentation'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'id'
              ? 'Evaluasi metrik DBI, Silhouette, & Calinski-Harabasz per kandidat k.'
              : 'DBI, Silhouette & Calinski-Harabasz evaluation per candidate k.'}
          </p>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-[#8A6534] animate-spin mt-1" />}
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={lang === 'id' ? 'TOTAL NASABAH TERSEGMEN' : 'TOTAL SEGMENTED CUSTOMERS'}
          value={totalCustomers != null ? totalCustomers.toLocaleString(numLocale) : '-'}
          sub="segmentation.cluster_result_aggregate"
          icon={Users}
        />
        <KpiCard
          label={lang === 'id' ? 'MODEL CLUSTER TERPILIH' : 'SELECTED CLUSTER MODEL'}
          value="K-Means"
          sub={optimalK != null ? (lang === 'id' ? `Optimal k = ${optimalK} Cluster` : `Optimal k = ${optimalK} Clusters`) : '-'}
          icon={Cpu}
        />
        <KpiCard
          label="DAVIES-BOULDIN INDEX"
          value={num(data?.optimalDbi, 4)}
          sub={lang === 'id' ? 'Skor pemisahan optimal' : 'Optimal separation score'}
          icon={Layers}
        />
        <KpiCard
          label={lang === 'id' ? 'AKURASI MODEL' : 'MODEL ACCURACY'}
          value="-"
          sub={lang === 'id' ? 'Belum tersedia' : 'Not available'}
          icon={CheckCircle2}
          inProgress
        />
      </div>

      {/* Model evaluation KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Davies-Bouldin Index"
          value={num(data?.optimalDbi, 4)}
          sub={optimalK != null ? (lang === 'id' ? `Skor pemisahan optimal (k=${optimalK})` : `Optimal separation score (k=${optimalK})`) : '-'}
          icon={Layers}
        />
        <KpiCard
          label="Silhouette Score"
          value={num(data?.optimalSilhouette, 4)}
          sub={lang === 'id' ? 'Kohesi internal & pemisahan' : 'Internal cohesion & separation'}
          icon={Cpu}
        />
        <KpiCard
          label="Calinski-Harabasz"
          value={data?.optimalCalinski != null ? data.optimalCalinski.toLocaleString(numLocale, { maximumFractionDigits: 1 }) : '-'}
          sub={lang === 'id' ? 'Skor rasio dispersi' : 'Dispersion ratio score'}
          icon={Layers}
        />
        <KpiCard
          label={lang === 'id' ? 'Tanggal Training' : 'Training Date'}
          value="-"
          sub={lang === 'id' ? 'Belum tersedia' : 'Not available'}
          icon={Clock}
          inProgress
        />
      </div>

      {/* One row: DBI chart (left) + Clustering Model Information (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* DBI per k chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {lang === 'id' ? 'Evaluasi DBI per kandidat k (Elbow Curve)' : 'DBI Evaluation per Candidate k (Elbow Curve)'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {lang === 'id'
                  ? `Nilai DBI terendah menunjukkan k optimal${optimalK != null ? ` (k=${optimalK})` : ''}.`
                  : `Lowest DBI value indicates optimal k${optimalK != null ? ` (k=${optimalK})` : ''}.`}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dbiData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="k" fontSize={11} stroke="#64748B" label={{ value: lang === 'id' ? 'k (Jumlah Cluster)' : 'k (Clusters)', position: 'insideBottomRight', offset: -5 }} />
                <YAxis fontSize={11} stroke="#64748B" />
                <Tooltip formatter={(v: number) => [v.toLocaleString(numLocale, { maximumFractionDigits: 4 }), 'DBI']} />
                <Line
                  type="monotone"
                  dataKey="dbi"
                  stroke="#8A6534"
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    const isOptimal = dbiData[props.index]?.k === optimalK;
                    return (
                      <circle
                        key={props.index}
                        cx={props.cx}
                        cy={props.cy}
                        r={isOptimal ? 6 : 4}
                        fill={isOptimal ? '#8A6534' : '#ffffff'}
                        stroke="#8A6534"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clustering Model Information */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 mb-3">
            {lang === 'id' ? 'Informasi Model Clustering' : 'Clustering Model Information'}
          </h3>
          <div className="space-y-1">
            <InfoRow label={lang === 'id' ? 'Model Terpilih' : 'Selected Model'} value="K-Means Clustering" />
            <InfoRow label="k optimal" value={optimalK != null ? `${optimalK} Cluster` : '-'} />
            <InfoRow label="Davies-Bouldin Index" value={num(data?.optimalDbi, 4)} />
            <InfoRow label="Silhouette Score" value={num(data?.optimalSilhouette, 4)} />
            <InfoRow label="Calinski-Harabasz" value={data?.optimalCalinski != null ? data.optimalCalinski.toLocaleString(numLocale, { maximumFractionDigits: 1 }) : '-'} />
            <InfoRow label={lang === 'id' ? 'Total Nasabah' : 'Total Customers'} value={totalCustomers != null ? totalCustomers.toLocaleString(numLocale) : '-'} />
            <InfoRow label={lang === 'id' ? 'Sumber Tabel' : 'Table Source'} value="ml_eva.cluster_model_selection" />
          </div>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className="text-xs font-bold text-slate-800">{value}</span>
    </div>
  );
}
