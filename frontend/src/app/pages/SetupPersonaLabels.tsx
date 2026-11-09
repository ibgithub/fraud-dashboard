import { useI18n } from '../i18n';
import { Tags, Save, Edit3 } from 'lucide-react';
import { PageHeader, StatusBanner, InProgressBadge } from './_inProgressKit';

const PERSONAS = [
  { cluster: 'C0', label: 'Senior & Aman', en: 'Senior & Secure', desc: 'Berorientasi keamanan, deposito & investasi risiko rendah', color: '#8A6534', count: 2450 },
  { cluster: 'C1', label: 'Nasabah Rentan', en: 'Vulnerable Customers', desc: 'Sensitif arus kas, butuh pendampingan & restrukturisasi', color: '#0E7490', count: 1890 },
  { cluster: 'C2', label: 'Pelajar Muda & Produktif', en: 'Young & Productive', desc: 'Digital-savvy, e-banking & QRIS aktif, sensitif reward', color: '#7C3AED', count: 1720 },
  { cluster: 'C3', label: 'Pengusaha Kecil', en: 'Small Entrepreneurs', desc: 'Usaha mikro & SME, transaksi bisnis, kredit modal kerja', color: '#059669', count: 980 },
];

export function SetupPersonaLabels() {
  const { lang } = useI18n();
  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      <PageHeader
        crumb="SET-07"
        title={lang === 'id' ? 'Label Persona' : 'Persona Labels'}
        subtitle={lang === 'id'
          ? 'Kelola nama, deskripsi, dan warna label persona untuk setiap segmen.'
          : 'Manage names, descriptions, and label colors for each segment.'}
        actions={
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8A6534] hover:bg-[#6B4E2E] text-white text-xs font-semibold transition shadow-2xs">
            <Save className="w-3.5 h-3.5" /> {lang === 'id' ? 'Simpan' : 'Save'}
          </button>
        }
      />
      <StatusBanner
        title={lang === 'id' ? 'Modul Label Persona' : 'Persona Labels Module'}
        desc={lang === 'id'
          ? 'Pemetaan label persona ke segmen sedang diintegrasikan dengan backend. Label di bawah adalah pratinjau [In Progress].'
          : 'Persona-to-segment label mapping is being integrated with the backend. Labels below are an [In Progress] preview.'}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PERSONAS.map((p) => (
          <div key={p.cluster} className="bg-white border border-slate-200 border-l-4 rounded-xl p-5 shadow-2xs transition hover:shadow-md" style={{ borderLeftColor: p.color }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: p.color }}>{p.cluster}</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{lang === 'id' ? p.label : p.en}</h4>
                  <p className="text-[11px] text-slate-400">{lang === 'id' ? p.en : p.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <InProgressBadge />
                <button className="text-slate-400 hover:text-[#8A6534] transition"><Edit3 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">{p.desc}</p>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">{lang === 'id' ? 'Nasabah terpetakan' : 'Mapped customers'}</span>
              <span className="text-sm font-black" style={{ color: p.color }}>{p.count.toLocaleString('id-ID')}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tags className="w-4 h-4 text-[#8A6534]" />
          <p className="text-xs text-slate-600">{lang === 'id' ? 'Perubahan label akan otomatis diterapkan ke seluruh halaman analitik setelah integrasi backend selesai.' : 'Label changes will automatically apply across all analytics pages once backend integration is complete.'}</p>
        </div>
        <InProgressBadge />
      </div>
    </div>
  );
}
