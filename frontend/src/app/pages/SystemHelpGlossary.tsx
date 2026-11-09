import { useState } from 'react';
import { useI18n } from '../i18n';
import { BookOpen, Search, HelpCircle } from 'lucide-react';
import { PageHeader, StatusBanner, Badge, InProgressBadge, THEME } from './_inProgressKit';

const GLOSSARY = [
  { term: 'Churn Index', cat: 'Churn', color: '#C0392B', def: 'Skor 0–100 yang memperkirakan risiko nasabah menutup rekening atau berhenti bertransaksi.' },
  { term: 'CPI Matrix', cat: 'Matrix', color: '#1F3864', def: 'Matriks 3×3 yang menggabungkan dimensi Churn dan Profitability menjadi 9 segmen prioritas.' },
  { term: 'C3 Hot Target', cat: 'Matrix', color: '#C0392B', def: 'Kuadran prioritas: nasabah dengan profitabilitas tinggi dan risiko churn tinggi.' },
  { term: 'Davies-Bouldin Index', cat: 'Segmentation', color: '#7C3AED', def: 'Metrik evaluasi segmentasi; nilai lebih rendah menandakan pemisahan segmen yang lebih baik.' },
  { term: 'Lift', cat: 'Recommender', color: '#0E7490', def: 'Rasio yang mengukur seberapa kuat asosiasi antar produk dibanding kebetulan acak.' },
  { term: 'Confidence', cat: 'Recommender', color: '#0E7490', def: 'Probabilitas produk B dibeli ketika produk A sudah dimiliki.' },
  { term: 'Profitability Tier', cat: 'Profitability', color: '#8A6534', def: 'Klasifikasi kontribusi finansial nasabah: Lo, Med, Hi untuk 6 bulan ke depan.' },
  { term: 'Persona', cat: 'Segmentation', color: '#059669', def: 'Label deskriptif untuk segmen nasabah berdasarkan demografi dan perilaku.' },
];

const CATEGORIES = ['Semua', 'Churn', 'Profitability', 'Segmentation', 'Matrix', 'Recommender'];

export function SystemHelpGlossary() {
  const { lang } = useI18n();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Semua');

  const filtered = GLOSSARY.filter((g) =>
    (cat === 'Semua' || g.cat === cat) &&
    (g.term.toLowerCase().includes(query.toLowerCase()) || g.def.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      <PageHeader
        crumb="SYS-02"
        title={lang === 'id' ? 'Bantuan & Glosarium' : 'Help & Glossary'}
        subtitle={lang === 'id'
          ? 'Definisi istilah analitik CPI dan panduan penggunaan platform.'
          : 'Definitions of CPI analytics terms and platform usage guide.'}
      />
      <StatusBanner
        title={lang === 'id' ? 'Modul Bantuan & Glosarium' : 'Help & Glossary Module'}
        desc={lang === 'id'
          ? 'Basis pengetahuan sedang dilengkapi. Isi di bawah adalah pratinjau [In Progress].'
          : 'Knowledge base is being populated. Content below is an [In Progress] preview.'}
      />

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === 'id' ? 'Cari istilah...' : 'Search term...'}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A6534]/40"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition ${cat === c ? 'bg-[#8A6534] text-white border-[#8A6534]' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
            >
              {c === 'Semua' && lang === 'en' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((g) => (
          <div key={g.term} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs transition hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: g.color }} />
                <h4 className="text-sm font-bold text-slate-800">{g.term}</h4>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ backgroundColor: `${g.color}14`, color: g.color, borderColor: `${g.color}33` }}>{g.cat}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{g.def}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-slate-400 text-sm italic">
            {lang === 'id' ? 'Tidak ada istilah yang cocok.' : 'No matching terms.'}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 border-l-4 border-l-[#1F3864] rounded-xl p-5 shadow-2xs flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-[#1F3864] mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">{lang === 'id' ? 'Butuh bantuan lebih lanjut?' : 'Need more help?'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{lang === 'id' ? 'Panduan lengkap, video tutorial, dan FAQ akan tersedia setelah integrasi backend selesai.' : 'Full guides, video tutorials, and FAQs will be available once backend integration is complete.'}</p>
          </div>
        </div>
        <InProgressBadge />
      </div>
    </div>
  );
}
