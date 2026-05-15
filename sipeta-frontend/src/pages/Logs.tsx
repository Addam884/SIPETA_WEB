import React, { useState } from 'react';
import {
  useKasusLog, useAktivitasLog, useFileLog, useLogSummary,
  type KasusLogRow, type AktivitasRow, type FileLogRow,
} from '../services/Uselogs';
import '../styles/Logs.css';

// ─── Types ─────────────────────────────────────────────────────────────────

type Tab = 'kasus' | 'aktivitas' | 'file';

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmtDT = (ts: string | null) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtDate = (ts: string | null) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtBytes = (b: number | null) => {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

// ─── Badge components ──────────────────────────────────────────────────────

const AksiBadge: React.FC<{ aksi: string }> = ({ aksi }) => {
  const cfg: Record<string, { cls: string; icon: string }> = {
    Tambah:    { cls: 'log-badge-tambah',  icon: '+' },
    Edit:      { cls: 'log-badge-edit',    icon: '✎' },
    Hapus:     { cls: 'log-badge-hapus',   icon: '✕' },
    Login:     { cls: 'log-badge-login',   icon: '→' },
    Logout:    { cls: 'log-badge-logout',  icon: '←' },
    Import:    { cls: 'log-badge-import',  icon: '↓' },
    Export:    { cls: 'log-badge-export',  icon: '↑' },
    import:    { cls: 'log-badge-import',  icon: '↓' },
    export:    { cls: 'log-badge-export',  icon: '↑' },
    default:   { cls: 'log-badge-default', icon: '•' },
  };
  const { cls, icon } = cfg[aksi] ?? cfg.default;
  return <span className={`log-badge ${cls}`}>{icon} {aksi}</span>;
};

const StatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
  if (!status) return <span className="log-badge log-badge-default">—</span>;
  const ok = status.toLowerCase().includes('berhasil') || status.toLowerCase() === 'success';
  return <span className={`log-badge ${ok ? 'log-badge-ok' : 'log-badge-fail'}`}>{status}</span>;
};

const RoleBadge: React.FC<{ role: string | null }> = ({ role }) => (
  <span className="log-role-badge">{role ?? 'User'}</span>
);

// ─── Summary Cards ─────────────────────────────────────────────────────────

const SummaryCards: React.FC = () => {
  const { summary, loading } = useLogSummary();

  const cards = [
    { label: 'Aktivitas Hari Ini', val: summary?.aktivitas_hari_ini ?? 0, icon: '⚡', color: '#185FA5', bg: '#E6F1FB' },
    { label: 'Tambah Bulan Ini',   val: summary?.tambah_bulan_ini   ?? 0, icon: '+',  color: '#3B6D11', bg: '#EAF3DE' },
    { label: 'Edit Bulan Ini',     val: summary?.edit_bulan_ini     ?? 0, icon: '✎',  color: '#D97706', bg: '#FEF3C7' },
    { label: 'Hapus Bulan Ini',    val: summary?.hapus_bulan_ini    ?? 0, icon: '✕',  color: '#A32D2D', bg: '#FCEBEB' },
    { label: 'Import Hari Ini',    val: summary?.import_hari_ini    ?? 0, icon: '↓',  color: '#7C3AED', bg: '#EDE9FE' },
    { label: 'Export Hari Ini',    val: summary?.export_hari_ini    ?? 0, icon: '↑',  color: '#0891B2', bg: '#ECFEFF' },
  ];

  return (
    <div className="log-cards-row">
      {cards.map(c => (
        <div key={c.label} className={`log-summary-card ${loading ? 'log-skeleton' : ''}`}>
          <div className="log-card-icon" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
          <div>
            <div className="log-card-val" style={{ color: c.color }}>{c.val}</div>
            <div className="log-card-label">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Filter Bar ────────────────────────────────────────────────────────────

const FilterBar: React.FC<{
  children: React.ReactNode;
  onReset: () => void;
}> = ({ children, onReset }) => (
  <div className="log-filter-bar">
    {children}
    <button className="log-reset-btn" onClick={onReset}>↺ Reset</button>
  </div>
);

// ─── Detail Drawer ─────────────────────────────────────────────────────────

const DetailDrawer: React.FC<{
  row: KasusLogRow | AktivitasRow | FileLogRow | null;
  tab: Tab;
  onClose: () => void;
}> = ({ row, tab, onClose }) => {
  if (!row) return null;

  const renderKV = (label: string, val: any) => (
    <div key={label} className="log-drawer-kv">
      <span className="log-drawer-key">{label}</span>
      <span className="log-drawer-val">{String(val ?? '—')}</span>
    </div>
  );

  return (
    <div className="log-drawer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="log-drawer">
        <div className="log-drawer-header">
          <h3 className="log-drawer-title">Detail Riwayat</h3>
          <button className="log-drawer-close" onClick={onClose}>×</button>
        </div>

        <div className="log-drawer-body">
          {tab === 'kasus' && (() => {
            const r = row as KasusLogRow;
            return (
              <>
                <div className="log-drawer-section">Informasi Aksi</div>
                {renderKV('Aksi',       <AksiBadge aksi={r.aksi} />)}
                {renderKV('Waktu',      fmtDT(r.timestamp))}
                {renderKV('Oleh',       r.nama_user)}
                {renderKV('Role',       r.role_user)}
                {renderKV('IP Address', r.ip_address)}

                <div className="log-drawer-section" style={{ marginTop: 16 }}>Data Kasus</div>
                {renderKV('Penyakit',    r.nama_penyakit)}
                {renderKV('Kode ICD',    r.kode_icd)}
                {renderKV('Wilayah',     r.nama_wilayah)}
                {renderKV('Tanggal',     fmtDate(r.tanggal_kasus))}
                {renderKV('Usia',        r.umur ? `${r.umur} thn` : null)}
                {renderKV('JK',          r.jenis_kelamin)}
                {renderKV('Status',      r.status_kasus)}
                {renderKV('Keterangan',  r.keterangan)}

                {r.data_before && (
                  <>
                    <div className="log-drawer-section" style={{ marginTop: 16 }}>Data Sebelum</div>
                    <pre className="log-drawer-json">{JSON.stringify(r.data_before, null, 2)}</pre>
                  </>
                )}
                {r.data_after && (
                  <>
                    <div className="log-drawer-section" style={{ marginTop: 8 }}>Data Sesudah</div>
                    <pre className="log-drawer-json">{JSON.stringify(r.data_after, null, 2)}</pre>
                  </>
                )}
              </>
            );
          })()}

          {tab === 'aktivitas' && (() => {
            const r = row as AktivitasRow;
            return (
              <>
                <div className="log-drawer-section">Informasi Aktivitas</div>
                {renderKV('Aktivitas',   r.aktivitas)}
                {renderKV('Modul',       r.modul)}
                {renderKV('Deskripsi',   r.deskripsi)}
                {renderKV('Waktu',       fmtDT(r.timestamp))}

                <div className="log-drawer-section" style={{ marginTop: 16 }}>Pengguna</div>
                {renderKV('Nama',       r.nama_user)}
                {renderKV('Email',      r.email)}
                {renderKV('Role',       r.role_user)}
                {renderKV('IP Address', r.ip_address)}
              </>
            );
          })()}

          {tab === 'file' && (() => {
            const r = row as FileLogRow;
            return (
              <>
                <div className="log-drawer-section">Informasi File</div>
                {renderKV('Nama File',    r.nama_file)}
                {renderKV('Nama Asli',    r.nama_asli)}
                {renderKV('Jenis',        r.jenis_file?.toUpperCase())}
                {renderKV('Tipe Aksi',    <AksiBadge aksi={r.tipe_aksi} />)}
                {renderKV('Jumlah Data',  r.jumlah_data?.toLocaleString('id-ID'))}
                {renderKV('Ukuran',       fmtBytes(r.ukuran_file))}
                {renderKV('Status',       <StatusBadge status={r.status} />)}
                {renderKV('Keterangan',   r.keterangan)}
                {renderKV('Waktu',        fmtDT(r.tanggal_upload))}

                <div className="log-drawer-section" style={{ marginTop: 16 }}>Pengguna</div>
                {renderKV('Diupload Oleh', r.nama_user)}
                {renderKV('Role',          r.role_user)}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

// ─── Tab: Riwayat Kasus ────────────────────────────────────────────────────

const TabKasus: React.FC = () => {
  const [search, setSearch]   = useState('');
  const [aksi, setAksi]       = useState('');
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');
  const [page, setPage]       = useState(1);
  const [perPage]             = useState(15);
  const [detail, setDetail]   = useState<KasusLogRow | null>(null);

  const { data, loading, error } = useKasusLog({ search, aksi, from, to, page, per_page: perPage });
  const rows       = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = data?.last_page ?? 1;
  const start      = (page - 1) * perPage;

  const reset = () => { setSearch(''); setAksi(''); setFrom(''); setTo(''); setPage(1); };

  return (
    <>
      <FilterBar onReset={reset}>
        <div className="dk-search-wrap">
          <svg className="dk-search-icon" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="dk-search" placeholder="Cari penyakit, wilayah, user…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="dk-filter-select" value={aksi} onChange={e => { setAksi(e.target.value); setPage(1); }}>
          <option value="">Aksi: Semua</option>
          {['Tambah','Edit','Hapus'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="log-date-range">
          <input type="date" className="dk-filter-select" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
          <span className="log-date-sep">–</span>
          <input type="date" className="dk-filter-select" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
        </div>
      </FilterBar>

      {error && <div className="dk-error-bar">⚠ {error}</div>}

      <div className="dk-table-wrap">
        <table className="dk-table log-table">
          <thead>
            <tr>
              <th>#</th>
              <th>AKSI</th>
              <th>PENYAKIT</th>
              <th>KODE ICD</th>
              <th>WILAYAH</th>
              <th>TGL KASUS</th>
              <th>ADMIN</th>
              <th>WAKTU</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(9)].map((_, j) => <td key={j}><div className="log-cell-skel" /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="dk-empty-row">Tidak ada log</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.id} className="log-row" onClick={() => setDetail(row)}>
                <td className="dk-cell-num">{start + i + 1}</td>
                <td><AksiBadge aksi={row.aksi} /></td>
                <td>
                  <div className="dk-disease-name">{row.nama_penyakit ?? '—'}</div>
                </td>
                <td><span className="dk-disease-code">{row.kode_icd ?? '—'}</span></td>
                <td style={{ fontSize: 12 }}>{row.nama_wilayah ?? '—'}</td>
                <td style={{ fontSize: 12 }}>{fmtDate(row.tanggal_kasus)}</td>
                <td>
                  <div className="log-user-cell">
                    <div className="log-avatar">{(row.nama_user ?? 'U')[0]}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{row.nama_user ?? '—'}</div>
                      <RoleBadge role={row.role_user} />
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                  {fmtDT(row.timestamp)}
                </td>
                <td>
                  <button className="log-detail-btn" onClick={e => { e.stopPropagation(); setDetail(row); }}>
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LogPagination page={page} totalPages={totalPages} total={total} perPage={perPage} start={start} onPage={setPage} />
      <DetailDrawer row={detail} tab="kasus" onClose={() => setDetail(null)} />
    </>
  );
};

// ─── Tab: Riwayat Aktivitas ────────────────────────────────────────────────

const MODUL_LIST = ['Auth','Kasus','GIS','File','Pengaturan','Clustering'];

const TabAktivitas: React.FC = () => {
  const [search, setSearch] = useState('');
  const [modul, setModul]   = useState('');
  const [from, setFrom]     = useState('');
  const [to, setTo]         = useState('');
  const [page, setPage]     = useState(1);
  const [perPage]           = useState(15);
  const [detail, setDetail] = useState<AktivitasRow | null>(null);

  const { data, loading, error } = useAktivitasLog({ search, modul, from, to, page, per_page: perPage });
  const rows       = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = data?.last_page ?? 1;
  const start      = (page - 1) * perPage;

  const reset = () => { setSearch(''); setModul(''); setFrom(''); setTo(''); setPage(1); };

  const modulColor: Record<string, string> = {
    Auth: '#185FA5', Kasus: '#3B6D11', GIS: '#D97706',
    File: '#7C3AED', Pengaturan: '#0891B2', Clustering: '#A32D2D',
  };

  return (
    <>
      <FilterBar onReset={reset}>
        <div className="dk-search-wrap">
          <svg className="dk-search-icon" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="dk-search" placeholder="Cari nama user, aktivitas…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="dk-filter-select" value={modul} onChange={e => { setModul(e.target.value); setPage(1); }}>
          <option value="">Modul: Semua</option>
          {MODUL_LIST.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="log-date-range">
          <input type="date" className="dk-filter-select" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
          <span className="log-date-sep">–</span>
          <input type="date" className="dk-filter-select" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
        </div>
      </FilterBar>

      {error && <div className="dk-error-bar">⚠ {error}</div>}

      <div className="dk-table-wrap">
        <table className="dk-table log-table">
          <thead>
            <tr>
              <th>#</th>
              <th>USER</th>
              <th>ROLE</th>
              <th>AKTIVITAS</th>
              <th>MODUL</th>
              <th>DESKRIPSI</th>
              <th>IP</th>
              <th>WAKTU</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(9)].map((_, j) => <td key={j}><div className="log-cell-skel" /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="dk-empty-row">Tidak ada log</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.id} className="log-row" onClick={() => setDetail(row)}>
                <td className="dk-cell-num">{start + i + 1}</td>
                <td>
                  <div className="log-user-cell">
                    <div className="log-avatar">{(row.nama_user ?? 'U')[0]}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{row.nama_user ?? '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{row.email ?? ''}</div>
                    </div>
                  </div>
                </td>
                <td><RoleBadge role={row.role_user} /></td>
                <td><AksiBadge aksi={row.aktivitas} /></td>
                <td>
                  <span className="log-modul-chip" style={{ background: (modulColor[row.modul] ?? '#6b7280') + '18', color: modulColor[row.modul] ?? '#6b7280' }}>
                    {row.modul}
                  </span>
                </td>
                <td style={{ fontSize: 12, maxWidth: 240 }}>
                  <div className="log-desc-cell">{row.deskripsi ?? '—'}</div>
                </td>
                <td style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>{row.ip_address ?? '—'}</td>
                <td style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{fmtDT(row.timestamp)}</td>
                <td><button className="log-detail-btn" onClick={e => { e.stopPropagation(); setDetail(row); }}>Detail</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LogPagination page={page} totalPages={totalPages} total={total} perPage={perPage} start={start} onPage={setPage} />
      <DetailDrawer row={detail} tab="aktivitas" onClose={() => setDetail(null)} />
    </>
  );
};

// ─── Tab: Riwayat File ─────────────────────────────────────────────────────

const TabFile: React.FC = () => {
  const [search, setSearch]     = useState('');
  const [tipeAksi, setTipeAksi] = useState('');
  const [status, setStatus]     = useState('');
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [page, setPage]         = useState(1);
  const [perPage]               = useState(15);
  const [detail, setDetail]     = useState<FileLogRow | null>(null);

  const { data, loading, error } = useFileLog({ search, tipe_aksi: tipeAksi, status, from, to, page, per_page: perPage });
  const rows       = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = data?.last_page ?? 1;
  const start      = (page - 1) * perPage;

  const reset = () => { setSearch(''); setTipeAksi(''); setStatus(''); setFrom(''); setTo(''); setPage(1); };

  const fileIcon = (jenis: string | null) => {
    const j = (jenis ?? '').toLowerCase();
    if (j === 'xlsx' || j === 'xls') return '📊';
    if (j === 'csv') return '📄';
    if (j === 'pdf') return '📕';
    return '📁';
  };

  return (
    <>
      <FilterBar onReset={reset}>
        <div className="dk-search-wrap">
          <svg className="dk-search-icon" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="dk-search" placeholder="Cari nama file, user…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="dk-filter-select" value={tipeAksi} onChange={e => { setTipeAksi(e.target.value); setPage(1); }}>
          <option value="">Tipe: Semua</option>
          <option value="import">Import</option>
          <option value="export">Export</option>
        </select>
        <select className="dk-filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Status: Semua</option>
          <option value="Berhasil">Berhasil</option>
          <option value="Gagal">Gagal</option>
        </select>
        <div className="log-date-range">
          <input type="date" className="dk-filter-select" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
          <span className="log-date-sep">–</span>
          <input type="date" className="dk-filter-select" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
        </div>
      </FilterBar>

      {error && <div className="dk-error-bar">⚠ {error}</div>}

      <div className="dk-table-wrap">
        <table className="dk-table log-table">
          <thead>
            <tr>
              <th>#</th>
              <th>FILE</th>
              <th>TIPE</th>
              <th>FORMAT</th>
              <th>JUMLAH DATA</th>
              <th>UKURAN</th>
              <th>STATUS</th>
              <th>DIUPLOAD OLEH</th>
              <th>WAKTU</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(10)].map((_, j) => <td key={j}><div className="log-cell-skel" /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="dk-empty-row">Tidak ada log file</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.id} className="log-row" onClick={() => setDetail(row)}>
                <td className="dk-cell-num">{start + i + 1}</td>
                <td>
                  <div className="log-file-cell">
                    <span className="log-file-icon">{fileIcon(row.jenis_file)}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{row.nama_asli ?? row.nama_file}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{row.nama_file}</div>
                    </div>
                  </div>
                </td>
                <td><AksiBadge aksi={row.tipe_aksi} /></td>
                <td>
                  <span className="log-format-badge">{(row.jenis_file ?? '—').toUpperCase()}</span>
                </td>
                <td style={{ fontSize: 12, textAlign: 'right' }}>
                  {row.jumlah_data?.toLocaleString('id-ID') ?? '—'}
                </td>
                <td style={{ fontSize: 12 }}>{fmtBytes(row.ukuran_file)}</td>
                <td><StatusBadge status={row.status} /></td>
                <td>
                  <div className="log-user-cell">
                    <div className="log-avatar">{(row.nama_user ?? 'U')[0]}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{row.nama_user ?? '—'}</div>
                      <RoleBadge role={row.role_user} />
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{fmtDT(row.tanggal_upload)}</td>
                <td><button className="log-detail-btn" onClick={e => { e.stopPropagation(); setDetail(row); }}>Detail</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LogPagination page={page} totalPages={totalPages} total={total} perPage={perPage} start={start} onPage={setPage} />
      <DetailDrawer row={detail} tab="file" onClose={() => setDetail(null)} />
    </>
  );
};

// ─── Pagination ────────────────────────────────────────────────────────────

const LogPagination: React.FC<{
  page: number; totalPages: number; total: number;
  perPage: number; start: number; onPage: (p: number) => void;
}> = ({ page, totalPages, total, perPage, start, onPage }) => (
  <div className="dk-pagination" style={{ marginTop: 12 }}>
    <span style={{ fontSize: 12 }}>
      {total === 0 ? 0 : start + 1}–{Math.min(start + perPage, total)} dari {total.toLocaleString('id-ID')} log
    </span>
    <div className="dk-pagination-right">
      <div className="dk-pg-controls">
        <span className="dk-pg-info">{page}/{totalPages}</span>
        <button className="dk-pg-btn" onClick={() => onPage(page - 1)} disabled={page <= 1}>‹</button>
        <button className="dk-pg-btn" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>›</button>
      </div>
    </div>
  </div>
);

// ─── Main Logs Page ────────────────────────────────────────────────────────

const Logs: React.FC = () => {
  const [tab, setTab] = useState<Tab>('kasus');

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'kasus',     label: 'Riwayat Data Kasus',     icon: '🗂' },
    { key: 'aktivitas', label: 'Riwayat Aktivitas Admin', icon: '👤' },
    { key: 'file',      label: 'Riwayat Import & Export', icon: '📁' },
  ];

  return (
    <div className="log-page">

      {/* Summary Cards */}
      <SummaryCards />

      {/* Tab Card */}
      <div className="dk-card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Tabs */}
        <div className="log-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`log-tab-btn ${tab === t.key ? 'log-tab-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <span className="log-tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="log-tab-content">
          {tab === 'kasus'     && <TabKasus />}
          {tab === 'aktivitas' && <TabAktivitas />}
          {tab === 'file'      && <TabFile />}
        </div>

      </div>
    </div>
  );
};

export default Logs;