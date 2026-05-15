import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import '../styles/Datakasus.css';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/Dialog';
import '../styles/Toast.css';
import {
  useKasus,
  useStatistik,
  emptyForm,
  type KasusForm,
  type KasusRow,
  type ImportRow,
} from '../services/Usekasus';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalType = 'add' | 'edit' | null;

interface PreviewRow {
  penyakit_id: number | null;
  wilayah_id: number | null;
  tanggal_kasus: string;
  umur: number;
  jenis_kelamin: 'L' | 'P';
  status: 'Dirawat' | 'Sembuh' | 'Inactive' | 'Meninggal';
  // Display only
  _penyakit_nama: string;
  _wilayah_nama: string;
  _valid: boolean;
  _error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_STATUS = ['Dirawat', 'Sembuh', 'Inactive', 'Meninggal'] as const;
const CHART_COLORS = ['#185FA5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const badgeClass = (status: KasusRow['status']) => ({
  Dirawat: 'dk-badge dk-badge-dirawat',
  Sembuh: 'dk-badge dk-badge-sembuh',
  Inactive: 'dk-badge dk-badge-inactive',
  Meninggal: 'dk-badge dk-badge-meninggal',
}[status] ?? 'dk-badge dk-badge-inactive');

const fmtBulan = (ym: string) => {
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: KasusRow['status'] }> = ({ status }) => (
  <span className={badgeClass(status)}>{status}</span>
);

const FormField: React.FC<{
  label: string; children: React.ReactNode; span2?: boolean; error?: string;
}> = ({ label, children, span2, error }) => (
  <div className={`dk-form-group${span2 ? ' dk-span-2' : ''}`}>
    <label>{label}</label>
    {children}
    {error && <span className="dk-field-error">{error}</span>}
  </div>
);

// ─── Summary Cards ────────────────────────────────────────────────────────────

const SummaryCards: React.FC<{ bulan: string }> = ({ bulan }) => {
  const { statistik, loading } = useStatistik(bulan);

  const topPenyakit = statistik?.penyakit_terbanyak?.[0];
  const topFaskes = statistik?.faskes_terbanyak?.[0];
  const byPenyakit = statistik?.kasus_by_penyakit ?? [];
  const totalAll = byPenyakit.reduce((s, r) => s + r.total, 0) || 1;

  if (loading) {
    return (
      <div className="dk-cards-row">
        {[1, 2, 3].map(i => <div key={i} className="dk-summary-card dk-skeleton" />)}
      </div>
    );
  }

  return (
    <div className="dk-cards-row">

      {/* Card 1: Penyakit terbanyak bulan ini */}
      <div className="dk-summary-card">
        <div className="dk-card-icon" style={{ background: '#E6F1FB' }}>
          <svg width="20" height="20" fill="none" stroke="#185FA5" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div className="dk-card-body">
          <div className="dk-card-label">Penyakit Terbanyak</div>
          <div className="dk-card-sub">{fmtBulan(bulan)}</div>
          <div className="dk-card-value">
            {topPenyakit ? topPenyakit.nama_penyakit : '—'}
          </div>
          {topPenyakit && (
            <div className="dk-card-meta">
              <span className="dk-badge dk-badge-dirawat">{topPenyakit.total} kasus</span>
              {topPenyakit.kode_icd && <span className="dk-icd-badge">{topPenyakit.kode_icd}</span>}
            </div>
          )}
          {/* Mini bar chart top 5 */}
          <div className="dk-mini-bars">
            {statistik?.penyakit_terbanyak?.slice(0, 5).map((p, i) => (
              <div key={i} className="dk-mini-bar-row">
                <span className="dk-mini-bar-label">{p.nama_penyakit}</span>
                <div className="dk-mini-bar-track">
                  <div
                    className="dk-mini-bar-fill"
                    style={{
                      width: `${(p.total / (statistik.penyakit_terbanyak[0]?.total || 1)) * 100}%`,
                      background: CHART_COLORS[i],
                    }}
                  />
                </div>
                <span className="dk-mini-bar-val">{p.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card 2: Faskes dengan pasien terbanyak */}
      <div className="dk-summary-card">
        <div className="dk-card-icon" style={{ background: '#EAF3DE' }}>
          <svg width="20" height="20" fill="none" stroke="#3B6D11" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="dk-card-body">
          <div className="dk-card-label">Faskes Terbanyak</div>
          <div className="dk-card-sub">Bulan {fmtBulan(bulan)}</div>
          <div className="dk-card-value">
            {topFaskes ? topFaskes.nama_faskes : '—'}
          </div>
          {topFaskes && (
            <div className="dk-card-meta">
              <span className="dk-badge dk-badge-sembuh">{topFaskes.total} pasien</span>
            </div>
          )}
          <div className="dk-faskes-list">
            {statistik?.faskes_terbanyak?.slice(0, 5).map((f, i) => (
              <div key={i} className="dk-faskes-list-row">
                <span className="dk-faskes-rank" style={{ background: CHART_COLORS[i] }}>{i + 1}</span>
                <span className="dk-faskes-list-name">{f.nama_faskes}</span>
                <span className="dk-faskes-list-total">{f.total}</span>
              </div>
            ))}
            {(!statistik?.faskes_terbanyak?.length) && (
              <div className="dk-faskes-empty-note">Belum ada data faskes</div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Kasus by jenis penyakit */}
      <div className="dk-summary-card">
        <div className="dk-card-icon" style={{ background: '#FEF3C7' }}>
          <svg width="20" height="20" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        </div>
        <div className="dk-card-body">
          <div className="dk-card-label">Sebaran Penyakit</div>
          <div className="dk-card-sub">Bulan {fmtBulan(bulan)} · {totalAll} total</div>
          {/* Stacked bar */}
          <div className="dk-stacked-bar">
            {byPenyakit.slice(0, 7).map((p, i) => (
              <div
                key={i}
                className="dk-stacked-seg"
                style={{ width: `${(p.total / totalAll) * 100}%`, background: CHART_COLORS[i] }}
                title={`${p.nama_penyakit}: ${p.total}`}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="dk-legend">
            {byPenyakit.slice(0, 7).map((p, i) => (
              <div key={i} className="dk-legend-row">
                <span className="dk-legend-dot" style={{ background: CHART_COLORS[i] }} />
                <span className="dk-legend-name">{p.nama_penyakit}</span>
                <span className="dk-legend-pct">{Math.round((p.total / totalAll) * 100)}%</span>
                <span className="dk-legend-total">{p.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card 4: Summary status bulan ini */}
      <div className="dk-summary-card dk-card-compact">
        <div className="dk-card-label" style={{ marginBottom: 12 }}>
          Ringkasan Status <span className="dk-card-sub" style={{ display: 'inline' }}>· {fmtBulan(bulan)}</span>
        </div>
        <div className="dk-status-grid">
          {[
            { label: 'Total', val: statistik?.total_kasus ?? 0, color: '#185FA5', bg: '#E6F1FB' },
            { label: 'Dirawat', val: statistik?.total_dirawat ?? 0, color: '#185FA5', bg: '#E6F1FB' },
            { label: 'Sembuh', val: statistik?.total_sembuh ?? 0, color: '#3B6D11', bg: '#EAF3DE' },
            { label: 'Meninggal', val: statistik?.total_meninggal ?? 0, color: '#A32D2D', bg: '#FCEBEB' },
          ].map(s => (
            <div key={s.label} className="dk-status-item" style={{ background: s.bg }}>
              <div className="dk-status-val" style={{ color: s.color }}>{s.val}</div>
              <div className="dk-status-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

// ─── File Parser (CSV + XLSX) ─────────────────────────────────────────────────

const parseFile = (
  file: File,
  penyakitList: any[],
  wilayahList: any[],
  onResult: (rows: PreviewRow[]) => void,
  onError: (msg: string) => void
) => {
  const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  console.log('📁 Parsing file:', file.name, 'Size:', file.size, 'Type:', file.type);

  const processRaw = (rawRows: string[][]) => {
    console.log('📊 Processing', rawRows.length, 'rows');
    console.log('Sample first row:', rawRows[0]);

    if (rawRows.length < 2) {
      onError('File kosong atau tidak memiliki data');
      return;
    }

    const headers = rawRows[0].map(h =>
      String(h ?? '').toLowerCase().trim().replace(/\s+/g, '_')
    );

    console.log('Headers found:', headers);

    const preview: PreviewRow[] = rawRows.slice(1)
      .filter(r => r.some(c => String(c ?? '').trim() !== ''))
      .map((row) => {
        const rec: Record<string, string> = {};
        headers.forEach((h, i) => {
          rec[h] = row[i] !== undefined && row[i] !== null
            ? String(row[i]).trim()
            : '';
        });

        const penyakitNama = rec.penyakit ?? rec.nama_penyakit ?? '';
        const wilayahNama = rec.wilayah ?? rec.nama_wilayah ?? rec.kecamatan ?? '';

        const matchP = penyakitList.find(p =>
          p.nama_penyakit.toLowerCase() === penyakitNama.toLowerCase() ||
          String(p.id) === penyakitNama
        );
        const matchW = wilayahList.find(w =>
          w.nama_wilayah.toLowerCase() === wilayahNama.toLowerCase() ||
          String(w.id) === wilayahNama
        );


        const rawStatus = (rec.status ?? 'Dirawat');
        const status = VALID_STATUS.find(
          s => s.toLowerCase() === rawStatus.toLowerCase()
        ) ?? 'Dirawat';

        const rawJk = (rec.jenis_kelamin ?? rec.jk ?? 'L').toUpperCase();
        const jk: 'L' | 'P' = rawJk === 'P' ? 'P' : 'L';

        const umur = parseInt(rec.umur ?? rec.usia ?? '0') || 0;

        const errors: string[] = [];
        if (!matchP) errors.push(`Penyakit "${penyakitNama}" tidak ditemukan`);
        if (!matchW) errors.push(`Wilayah "${wilayahNama}" tidak ditemukan`);

        return {
          penyakit_id: matchP?.id ?? null,
          wilayah_id: matchW?.id ?? null,
          tanggal_kasus: rec.tanggal_kasus ?? rec.tanggal ?? new Date().toISOString().split('T')[0],
          umur,
          jenis_kelamin: jk,
          status,
          _penyakit_nama: penyakitNama,
          _wilayah_nama: wilayahNama,
          _valid: errors.length === 0,
          _error: errors.join('; '),
        };
      });

    console.log('✅ Parsed:', preview.length, 'rows, valid:', preview.filter(r => r._valid).length);

    if (preview.length === 0) {
      onError('Tidak ada data yang bisa diparsing dari file');
      return;
    }

    onResult(preview);
  };

  if (isXlsx) {
    console.log('Reading as Excel file...');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        const json = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: '',
          raw: false,
          blankrows: false
        });

        console.log('Excel parsed successfully:', json?.length, 'rows');

        if (!json || json.length === 0) {
          onError('File Excel kosong atau tidak bisa dibaca');
          return;
        }

        // Pastikan semua nilai adalah string
        const stringData = (json as any[][]).map(row =>
          row.map(cell => String(cell ?? ''))
        );

        processRaw(stringData);
      } catch (error) {
        console.error('❌ Excel parse error:', error);
        onError('Gagal membaca file Excel. Pastikan format file benar.');
      }
    };
    reader.onerror = () => {
      console.error('❌ FileReader error:', reader.error);
      onError('Gagal membaca file');
    };
    reader.readAsArrayBuffer(file);
  } else {
    // CSV
    console.log('Reading as CSV file...');
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const rows = lines.map(l =>
        l.split(',').map(c => String(c.replace(/^"|"$/g, '').trim()))
      );
      processRaw(rows);
    };
    reader.onerror = () => onError('Gagal membaca file CSV');
    reader.readAsText(file, 'utf-8');
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

const DataKasus: React.FC = () => {
  const today = new Date();
  const [bulanStat, setBulanStat] = useState(today.toISOString().slice(0, 7));

  const [statKey, setstatKey] = useState(0); // for refreshing statistik  
  const refreshStat = useCallback(() => setstatKey(k => k + 1), []);

  // Table state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterPenyakit, setFilterPenyakit] = useState<number | ''>('');
  const [filterWilayah, setFilterWilayah] = useState<number | ''>('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate]);

  // Modal state
  const [modal, setModal] = useState<ModalType>(null);
  const [editRow, setEditRow] = useState<KasusRow | null>(null);
  const [form, setForm] = useState<KasusForm>(emptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Upload state
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false); // Drag and drop state
  const fileRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'warning' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ show: true, message, type });
  }, []);

  // Dialog
  interface ConfirmState {
    open: boolean;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
  }
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, message: '', onConfirm: () => { } });

  const showConfirm = (message: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'danger') => {
    setConfirm({ open: true, message, onConfirm, variant });
  };

  // API
  const {
    kasusData, penyakitList, wilayahList,
    loading, error,
    createKasus, updateKasus, deleteKasus, bulkDeleteKasus, bulkImportKasus,
  } = useKasus({
    search,
    penyakit_id: filterPenyakit,
    wilayah_id: filterWilayah,
    status: filterStatus || undefined,
    tanggal_mulai: startDate || undefined,
    tanggal_akhir: endDate || undefined,
    per_page: rowsPerPage,
    page,
  });

  const rows = kasusData?.data ?? [];
  const totalItems = kasusData?.total ?? 0;
  const totalPages = kasusData?.last_page ?? 1;
  const start = (page - 1) * rowsPerPage;
  const allPageSel = rows.length > 0 && rows.every(r => selected.has(r.id));
  const selectedPenyakit = penyakitList.find(p => p.id === form.penyakit_id);
  const validRows = previewData.filter(r => r._valid);
  const invalidRows = previewData.filter(r => !r._valid);

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleSelectAll = (checked: boolean) =>
    setSelected(prev => { const n = new Set(prev); rows.forEach(r => checked ? n.add(r.id) : n.delete(r.id)); return n; });

  const toggleRow = (id: number, checked: boolean) =>
    setSelected(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });

  // ── Bulk delete ────────────────────────────────────────────────────────────
  const handleBulkDelete = () => {
    const selectedIds = [...selected];          // ambil id sebelum di-reset
    if (selectedIds.length === 0) return;

    showConfirm(
      `Hapus ${selectedIds.length} data terpilih? Tindakan tidak dapat dibatalkan.`,
      async () => {
        try {
          await bulkDeleteKasus(selectedIds);
          setSelected(new Set());
          showToast(`${selectedIds.length} data berhasil dihapus`, 'success');
          refreshStat(); // refresh statistik setelah delete
        } catch (err: any) {
          const message = err?.message || 'Gagal menghapus data'
          showToast(message, 'error');
        } finally {
          setConfirm(prev => ({ ...prev, open: false }));
        }
      },
      'danger'
    );
  };

  const handleDelete = async (id: number) => {
    showConfirm('Hapus data ini? Tindakan tidak dapat dibatalkan.', async () => {
      try {
        await deleteKasus(id);
        showToast('Data berhasil dihapus', 'success');
        refreshStat(); // refresh statistik setelah delete
      } catch {
        showToast('Gagal menghapus data', 'error');
      }
      setConfirm(prev => ({ ...prev, open: false }));
    }, 'danger');
  };

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openAdd = () => { setForm(emptyForm()); setFormErrors({}); setPreviewData([]); setUploadedFile(null); setModal('add'); };
  const openEdit = (row: KasusRow) => {
    setEditRow(row);
    setForm({ penyakit_id: row.penyakit_id, wilayah_id: row.wilayah_id, faskes_id: row.faskes_id ?? '', tanggal_kasus: row.tanggal, umur: row.usia, jenis_kelamin: row.jk, status: row.status });
    setFormErrors({});
    setModal('edit');
  };
  const closeModal = () => { setModal(null); setEditRow(null); setForm(emptyForm()); setFormErrors({}); setPreviewData([]); setUploadedFile(null); setImportProgress(null); };

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.penyakit_id) e.penyakit_id = 'Penyakit wajib dipilih';
    if (!form.wilayah_id) e.wilayah_id = 'Wilayah wajib dipilih';
    if (!form.tanggal_kasus) e.tanggal_kasus = 'Tanggal wajib diisi';
    if (!form.umur) e.umur = 'Umur wajib diisi';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit manual ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (modal === 'add') { await createKasus(form); showToast('Data berhasil ditambahkan', 'success'); }
      else if (modal === 'edit' && editRow) { await updateKasus(editRow.id, form); showToast('Data berhasil diupdate', 'success'); }
      refreshStat(); // refresh statistik setelah submit
      closeModal();
    } catch (e: any) {
      const errs = e.response?.data?.errors;
      if (errs) {
        const mapped: Record<string, string> = {};
        Object.entries(errs).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? (v as string[])[0] : String(v); });
        setFormErrors(mapped);
      } else showToast(e.response?.data?.message ?? 'Terjadi kesalahan', 'error');
    } finally { setSaving(false); }
  };

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file.name);
    setPreviewData([]);
    parseFile(file, penyakitList, wilayahList,
      rows => setPreviewData(rows),
      msg => { showToast(msg, 'error'); setUploadedFile(null); }
    );
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Drag and Drop handlers ─────────────────────────────────────────────────
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    // Validasi ekstensi file
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      showToast('File harus berformat CSV atau Excel (.xlsx, .xls)', 'error');
      return;
    }
    
    setUploadedFile(file.name);
    setPreviewData([]);
    parseFile(file, penyakitList, wilayahList,
      rows => setPreviewData(rows),
      msg => { showToast(msg, 'error'); setUploadedFile(null); }
    );
  };

  // ── Import all valid rows ──────────────────────────────────────────────────
  const handleImportAll = async () => {
    if (validRows.length === 0) { showToast('Tidak ada baris valid untuk diimport', 'error'); return; }
    setImporting(true);
    setImportProgress({ done: 0, total: validRows.length });

    const importRows: ImportRow[] = validRows.map(r => ({
      penyakit_id: r.penyakit_id!,
      wilayah_id: r.wilayah_id!,
      tanggal_kasus: r.tanggal_kasus,
      umur: r.umur,
      jenis_kelamin: r.jenis_kelamin,
      status: r.status,
    }));

    try {
      const { success, failed } = await bulkImportKasus(importRows, (done, total) =>
        setImportProgress({ done, total })
      );
      // handleImportAll
      showToast(`Import selesai: ${success} berhasil${failed > 0 ? `, ${failed} gagal` : ''}`, failed > 0 ? 'warning' : 'success');
      refreshStat(); // refresh statistik setelah import
      closeModal();
    } catch {
      showToast('Import gagal', 'error');
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="dk-page">

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}

      <ConfirmDialog
        open={confirm.open}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(prev => ({ ...prev, open: false }))}
        variant={confirm.variant}
      />

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="dk-section-header">
        <h2 className="dk-section-title">Data Kasus</h2>
        <div className="dk-bulan-picker">
          <label>Bulan:</label>
          <input type="month" className="dk-input" value={bulanStat}
            onChange={e => setBulanStat(e.target.value)} style={{ width: 160 }} />
        </div>
      </div>

      <SummaryCards key={statKey} bulan={bulanStat} />

      {/* ── Filter Bar ────────────────────────────────────────────────────── */}

      <div className="dk-filters" style={{ marginTop: 24 }}>
        <select className="dk-filter-select" value={filterPenyakit}
          onChange={e => { setFilterPenyakit(e.target.value ? +e.target.value : ''); setPage(1); }}>
          <option value="">Penyakit: Semua</option>
          {penyakitList.map(p => <option key={p.id} value={p.id}>{p.nama_penyakit}</option>)}
        </select>
        <select className="dk-filter-select" value={filterWilayah}
          onChange={e => { setFilterWilayah(e.target.value ? +e.target.value : ''); setPage(1); }}>
          <option value="">Wilayah: Semua</option>
          {wilayahList.map(w => <option key={w.id} value={w.id}>{w.nama_wilayah}</option>)}
        </select>
        <select className="dk-filter-select" value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">Status: Semua</option>
          {VALID_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* ── Filter Tanggal ── */}
        <input
          type="date"
          className="dk-filter-select"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          placeholder="Dari tanggal"
          style={{ width: '150px' }}
        />
        <span style={{ margin: '0 4px', color: '#6b7280' }}>–</span>
        <input
          type="date"
          className="dk-filter-select"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          placeholder="Sampai tanggal"
          style={{ width: '150px' }}
        />
        {(startDate || endDate) && (
          <button
            className="dk-btn dk-btn-sm dk-btn-outline"
            onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
            style={{ marginLeft: 8 }}
          >
            Reset Tanggal
          </button>
        )}
      </div>

      {/* ── Table Card ────────────────────────────────────────────────────── */}
      <div className="dk-card">

        <div className="dk-card-header">
          <span className="dk-card-title">Tabel Data Kasus</span>
          <div className="dk-header-right">
            <div className="dk-search-wrap">
              <svg className="dk-search-icon" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input className="dk-search" type="text" placeholder="Cari… (Enter)"
                value={searchInput} onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }} />
            </div>
            <button className="dk-btn dk-btn-blue" onClick={openAdd}>+ Tambah Data</button>
          </div>
        </div>

        {error && <div className="dk-error-bar">⚠ {error}</div>}

        {selected.size > 0 && (
          <div className="dk-sel-bar">
            <span className="dk-sel-count">{selected.size} baris dipilih</span>
            <button className="dk-btn dk-btn-sm dk-btn-danger" onClick={handleBulkDelete}>Hapus dipilih</button>
            <button className="dk-btn dk-btn-sm dk-btn-outline" onClick={() => setSelected(new Set())}>Batalkan</button>
          </div>
        )}

        <div className="dk-table-wrap">
          <table className="dk-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allPageSel} onChange={e => toggleSelectAll(e.target.checked)} /></th>
                <th>#</th><th>PENYAKIT</th><th>TANGGAL</th><th>STATUS</th>
                <th>USIA</th><th>JK</th><th>WILAYAH</th><th>FASKES</th><th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="dk-empty-row"><div className="dk-loading-spinner" />Memuat data...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="dk-empty-row">Tidak ada data ditemukan</td></tr>
              ) : rows.map((row, i) => (
                <tr key={row.id} className={selected.has(row.id) ? 'dk-row-selected' : ''}>
                  <td><input type="checkbox" checked={selected.has(row.id)} onChange={e => toggleRow(row.id, e.target.checked)} /></td>
                  <td className="dk-cell-num">{start + i + 1}</td>
                  <td><div className="dk-disease-name">{row.penyakit}</div><div className="dk-disease-code">{row.kode_icd}</div></td>
                  <td>{row.tanggal}</td>
                  <td><StatusBadge status={row.status} /></td>
                  <td className="dk-cell-center">{row.usia} thn</td>
                  <td className="dk-cell-center"><span className={row.jk === 'L' ? 'dk-jk-l' : 'dk-jk-p'}>{row.jk === 'L' ? '♂' : '♀'} {row.jk}</span></td>
                  <td>{row.kecamatan}</td>
                  <td>{row.faskes ? <span className="dk-faskes-badge">🏥 {row.faskes}</span> : <span className="dk-faskes-empty">—</span>}</td>
                  <td>
                    <div className="dk-actions-icons">
                      <button
                        className="dk-action-icon dk-action-edit"
                        onClick={() => openEdit(row)}
                        title="Edit data"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3l4 4-7 7H10v-4l7-7z" />
                          <path d="M4 20h16" />
                        </svg>
                      </button>
                      <button
                        className="dk-action-icon dk-action-delete"
                        onClick={() => handleDelete(row.id)}
                        title="Hapus data"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7h16" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13" />
                          <path d="M9 3h6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dk-pagination">
          <span>{totalItems === 0 ? 0 : start + 1}–{Math.min(start + rowsPerPage, totalItems)} of {totalItems}</span>
          <div className="dk-pagination-right">
            <div className="dk-rows-sel">
              <span>Rows per page:</span>
              <select value={rowsPerPage} onChange={e => { setRowsPerPage(+e.target.value); setPage(1); }}>
                {[10, 25, 50, 100].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div className="dk-pg-controls">
              <span className="dk-pg-info">{page}/{totalPages}</span>
              <button className="dk-pg-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>‹</button>
              <button className="dk-pg-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="dk-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className={`dk-modal ${modal === 'add' ? 'dk-modal-lg' : 'dk-modal-sm'}`}>

            <div className="dk-modal-header">
              <h3 className="dk-modal-title">
                {modal === 'add' ? 'Tambah Data Kasus' : <>Edit Data — <span>{editRow?.penyakit}</span></>}
              </h3>
              <button className="dk-close-btn" onClick={closeModal}>×</button>
            </div>

            {/* Form fields (sama untuk add & edit) */}
            <div className="dk-form-grid-2">
              <FormField label="Penyakit *" error={formErrors.penyakit_id}>
                <select className={`dk-input${formErrors.penyakit_id ? ' dk-input-error' : ''}`}
                  value={form.penyakit_id} onChange={e => setForm(f => ({ ...f, penyakit_id: e.target.value ? +e.target.value : '' }))}>
                  <option value="">-- Pilih Penyakit --</option>
                  {penyakitList.map(p => <option key={p.id} value={p.id}>{p.nama_penyakit}</option>)}
                </select>
              </FormField>

              <FormField label="Kode ICD-10">
                <input className="dk-input dk-input-readonly" value={selectedPenyakit?.kode_icd ?? ''} readOnly placeholder="Otomatis terisi" />
              </FormField>

              <FormField label="Wilayah / Kecamatan *" error={formErrors.wilayah_id} span2>
                <select className={`dk-input${formErrors.wilayah_id ? ' dk-input-error' : ''}`}
                  value={form.wilayah_id} onChange={e => setForm(f => ({ ...f, wilayah_id: e.target.value ? +e.target.value : '' }))}>
                  <option value="">-- Pilih Wilayah --</option>
                  {wilayahList.map(w => <option key={w.id} value={w.id}>{w.nama_wilayah}</option>)}
                </select>
              </FormField>

              <FormField label="Tanggal Kasus *" error={formErrors.tanggal_kasus}>
                <input className={`dk-input${formErrors.tanggal_kasus ? ' dk-input-error' : ''}`}
                  type="date" value={form.tanggal_kasus} onChange={e => setForm(f => ({ ...f, tanggal_kasus: e.target.value }))} />
              </FormField>

              <FormField label="Umur (tahun) *" error={formErrors.umur}>
                <input className={`dk-input${formErrors.umur ? ' dk-input-error' : ''}`}
                  type="number" min={0} max={150} value={form.umur}
                  onChange={e => setForm(f => ({ ...f, umur: e.target.value ? +e.target.value : '' }))} placeholder="Contoh: 25" />
              </FormField>

              <FormField label="Jenis Kelamin">
                <select className="dk-input" value={form.jenis_kelamin}
                  onChange={e => setForm(f => ({ ...f, jenis_kelamin: e.target.value as 'L' | 'P' }))}>
                  <option value="L">L — Laki-laki</option>
                  <option value="P">P — Perempuan</option>
                </select>
              </FormField>

              <FormField label="Status">
                <select className="dk-input" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as KasusForm['status'] }))}>
                  {VALID_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
            </div>

            {/* Manual save button */}
            <div className="dk-form-actions" style={{ marginTop: 16 }}>
              {modal === 'edit' && (
                <button className="dk-btn dk-btn-outline" onClick={closeModal} disabled={saving}>Batal</button>
              )}
              <button className="dk-btn dk-btn-blue" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Menyimpan...' : (modal === 'add' ? 'Simpan Manual' : 'Simpan Perubahan')}
              </button>
            </div>

            {/* Upload section — hanya di Add modal */}
            {modal === 'add' && (
              <>
                <div className="dk-divider"><span>Atau Upload File Massal</span></div>

                <div className="dk-note">
                  <strong>Format kolom wajib:</strong> <code>penyakit, wilayah, tanggal_kasus, umur, jenis_kelamin, status</code><br />
                  Nilai jenis_kelamin: <code>L</code> atau <code>P</code> · Status: <code>Dirawat / Sembuh / Inactive / Meninggal</code><br />
                  Nama penyakit & wilayah harus sama persis dengan data di sistem. Mendukung <strong>CSV</strong> dan <strong>XLSX</strong>.
                </div>

                {/* Download template link */}
                <div style={{ marginBottom: 12 }}>
                  <button className="dk-btn dk-btn-ghost dk-btn-sm" onClick={() => {
                    const ws = XLSX.utils.aoa_to_sheet([
                      ['penyakit', 'wilayah', 'tanggal_kasus', 'umur', 'jenis_kelamin', 'status'],
                      ['ISPA', 'Patrang', '2024-01-15', '25', 'L', 'Dirawat'],
                    ]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Template');
                    XLSX.writeFile(wb, 'template_kasus.xlsx');
                  }}>
                    ⬇ Download Template Excel
                  </button>
                </div>

                {/* Drop zone dengan drag and drop */}
                <label style={{ display: 'block', cursor: 'pointer' }}>
                  <div 
                    className={`dk-upload-area ${isDragActive ? 'dk-upload-area-active' : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <svg className="dk-upload-icon" width="32" height="32" fill="none" stroke="#185FA5" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <div className="dk-upload-title">
                      {uploadedFile 
                        ? <>📄 {uploadedFile}</> 
                        : isDragActive 
                          ? 'Lepaskan file untuk upload' 
                          : 'Klik atau seret file ke sini'
                      }
                    </div>
                    <div className="dk-upload-sub">
                      {uploadedFile ? 'File siap diimport' : 'Mendukung CSV dan Excel (.xlsx)'}
                    </div>
                  </div>
                  <input 
                    ref={fileRef} 
                    type="file" 
                    accept=".csv,.xlsx,.xls" 
                    style={{ display: 'none' }} 
                    onChange={handleFileChange} 
                  />
                </label>

                {/* Preview */}
                {previewData.length > 0 && (
                  <>
                    <div className="dk-preview-header" style={{ marginTop: 20 }}>
                      <h4>Preview — {previewData.length} baris</h4>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {validRows.length > 0 && <span className="dk-badge dk-badge-sembuh">✓ {validRows.length} valid</span>}
                        {invalidRows.length > 0 && <span className="dk-badge dk-badge-meninggal">✕ {invalidRows.length} error</span>}
                      </div>
                    </div>

                    <div className="dk-preview-card" style={{ maxHeight: 280, overflow: 'auto' }}>
                      <table className="dk-table">
                        <thead>
                          <tr><th>#</th><th>PENYAKIT</th><th>WILAYAH</th><th>TANGGAL</th><th>STATUS</th><th>USIA</th><th>JK</th><th>KET</th></tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, i) => (
                            <tr key={i} className={row._valid ? '' : 'dk-row-error'}>
                              <td className="dk-cell-num">{i + 1}</td>
                              <td>{row._penyakit_nama}</td>
                              <td>{row._wilayah_nama}</td>
                              <td>{row.tanggal_kasus}</td>
                              <td><StatusBadge status={row.status} /></td>
                              <td>{row.umur} thn</td>
                              <td className={row.jenis_kelamin === 'L' ? 'dk-jk-l' : 'dk-jk-p'}>{row.jenis_kelamin}</td>
                              <td style={{ fontSize: 11, color: row._valid ? '#3B6D11' : '#A32D2D' }}>
                                {row._valid ? '✓ OK' : row._error}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Import progress bar */}
                    {importProgress && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                          Mengimport {importProgress.done} / {importProgress.total}...
                        </div>
                        <div className="dk-progress-track">
                          <div className="dk-progress-fill"
                            style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="dk-modal-footer" style={{ marginTop: 16 }}>
                      <button className="dk-btn dk-btn-outline" onClick={() => { setPreviewData([]); setUploadedFile(null); }} disabled={importing}>
                        Ganti File
                      </button>
                      <button className="dk-btn dk-btn-blue" onClick={handleImportAll} disabled={importing || validRows.length === 0}>
                        {importing ? 'Mengimport...' : `Import ${validRows.length} Data Valid`}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default DataKasus;