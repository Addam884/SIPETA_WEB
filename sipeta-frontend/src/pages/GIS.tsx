import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    MapContainer, TileLayer, GeoJSON, Marker, Popup,
    useMap, LayersControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
    useGeoJson, useFaskesGeoJson, useFaskesDetail,
    useTrend, useEpidemiologi, runClustering,
} from '../services/Usegis';
import api from '../services/api';
import '../styles/Gis.css';

// ─── Fix leaflet default icon ─────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── Constants ────────────────────────────────────────────────────────────────

const CLUSTER_COLORS: Record<number, string> = {
    0: '#86efac',  // Rendah — hijau
    1: '#fde68a',  // Sedang — kuning
    2: '#fca5a5',  // Tinggi — merah
};

const CLUSTER_TEXT: Record<number, string> = {
    0: '#166534',
    1: '#92400e',
    2: '#991b1b',
};

// ─── Faskes Icon ──────────────────────────────────────────────────────────────

const faskesIcon = (active = false) => L.divIcon({
    className: '',
    html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:${active ? '#185FA5' : '#fff'};
    border:2.5px solid #185FA5;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;
  ">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${active ? '#fff' : '#185FA5'}" stroke-width="2.5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
});

// ─── MapFit: fit map bounds ke geojson ────────────────────────────────────────

const MapFit: React.FC<{ geojson: any }> = ({ geojson }) => {
    const map = useMap();
    useEffect(() => {
        if (!geojson?.features?.length) return;
        try {
            const layer = L.geoJSON(geojson);
            const bounds = layer.getBounds();
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
        } catch { /* skip */ }
    }, [geojson, map]);
    return null;
};

// ─── Trend Bar Chart ──────────────────────────────────────────────────────────

const TrendChart: React.FC<{
    penyakitId: number | '';
    wilayahId: number | null;
    tahun: number;
    onPenyakitChange: (id: number | '') => void;
    penyakitList: any[];
}> = ({ penyakitId, wilayahId, tahun, onPenyakitChange, penyakitList }) => {
    const { trend, loading } = useTrend(penyakitId, wilayahId ?? '', tahun);

    const chartData = trend?.labels.map((label, i) => {
        const obj: Record<string, any> = { bulan: label };
        trend.datasets.forEach(ds => { obj[ds.label] = ds.data[i]; });
        return obj;
    }) ?? [];

    return (
        <div className="gis-chart-card">
            <div className="gis-chart-header">
                <span className="gis-chart-title">Tren Penyakit</span>
                <div className="gis-chart-controls">
                    <select className="gis-select-sm"
                        value={penyakitId}
                        onChange={e => onPenyakitChange(e.target.value ? +e.target.value : '')}>
                        <option value="">Semua Penyakit</option>
                        {penyakitList.map(p => <option key={p.id} value={p.id}>{p.nama_penyakit}</option>)}
                    </select>
                    <select className="gis-select-sm" defaultValue={tahun}>
                        <option value={tahun}>{tahun}</option>
                    </select>
                </div>
            </div>
            {loading ? (
                <div className="gis-chart-loading">Memuat grafik...</div>
            ) : (
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }}
                            domain={[0, 'auto']}
                            allowDecimals={false} />
                        <RechartTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {trend?.datasets.map(ds => (
                            <Bar key={ds.label} dataKey={ds.label} fill={ds.backgroundColor} radius={[3, 3, 0, 0]} maxBarSize={28} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};

// ─── Faskes Detail Panel ──────────────────────────────────────────────────────

const DISEASE_COLORS = ['#185FA5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const FaskesDetailPanel: React.FC<{
    faskesId: number | null;
    periode: string;
    onClose: () => void;
    penyakitId: number | '';
    wilayahId: number | null;
    tahun: number;
    penyakitList: any[];
    onPenyakitChange: (id: number | '') => void;
}> = ({ faskesId, periode, onClose, penyakitId, wilayahId, tahun, penyakitList, onPenyakitChange }) => {
    const { detail, loading } = useFaskesDetail(faskesId, periode);

    if (!faskesId) return (
        <div className="gis-detail-panel gis-detail-empty">
            <div className="gis-detail-hint">
                <svg width="40" height="40" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <p>Klik marker faskes<br />untuk melihat detail</p>
            </div>
            <TrendChart penyakitId={penyakitId} wilayahId={wilayahId} tahun={tahun}
                onPenyakitChange={onPenyakitChange} penyakitList={penyakitList} />
        </div>
    );

    if (loading) return (
        <div className="gis-detail-panel">
            <div className="gis-detail-loading">
                <div className="gis-spinner" /> Memuat detail...
            </div>
        </div>
    );

    if (!detail) return (
        <div className="gis-detail-panel gis-detail-empty">
            <div className="gis-detail-hint">
                <p style={{ color: '#ef4444' }}>Gagal memuat detail faskes.<br />Coba klik marker lagi.</p>
            </div>
            <button className="gis-close-btn" style={{ position: 'relative', marginTop: 8 }} onClick={onClose}>× Tutup</button>
        </div>
    );

    const populasi = detail.populasi ?? 0;
    const ir = detail.ir ?? 0;
    const cfr = detail.cfr ?? 0;
    const prevalence = detail.prevalence ?? 0;
    const kasusByPenyakit = detail.kasus_by_penyakit ?? [];

    return (
        <div className="gis-detail-panel">
            <div className="gis-detail-header">
                <div>
                    <div className="gis-detail-label">Detail Fasilitas Kesehatan :</div>
                    <div className="gis-detail-title">{detail.nama_faskes}</div>
                </div>
                <button className="gis-close-btn" onClick={onClose}>×</button>
            </div>

            <div className="gis-detail-info">
                {[
                    { label: 'Nama Fasilitas Kesehatan', value: detail.nama_faskes ?? '-' },
                    { label: 'Wilayah', value: detail.nama_wilayah ?? '-' },
                    { label: 'Latitude', value: detail.latitude != null ? parseFloat(String(detail.latitude)).toFixed(4) : '-' },
                    { label: 'Longitude', value: detail.longitude != null ? parseFloat(String(detail.longitude)).toFixed(4) : '-' },
                    { label: 'Insider Rate (IR)', value: `${ir} per 10.000 Penduduk` },
                    { label: 'Populasi*', value: `${populasi.toLocaleString('id-ID')} Jiwa` },
                ].map(r => (
                    <div key={r.label} className="gis-detail-row">
                        <span className="gis-detail-row-label">{r.label}</span>
                        <span className="gis-detail-row-sep">:</span>
                        <span className="gis-detail-row-val">{r.value}</span>
                    </div>
                ))}
            </div>

            <div className="gis-kasus-total-wrap">
                <div className="gis-kasus-total">
                    <div className="gis-kasus-total-num">{detail.total_kasus ?? 0}</div>
                    <div className="gis-kasus-total-label">Pasien</div>
                </div>
                <div className="gis-kasus-penyakit-chips">
                    {kasusByPenyakit.slice(0, 5).map((p: any, i: number) => (
                        <div key={i} className="gis-chip" style={{ color: DISEASE_COLORS[i] }}>
                            <span className="gis-chip-dot" style={{ background: DISEASE_COLORS[i] }} />
                            {p.total} Kasus <strong>{p.nama_penyakit}</strong>
                        </div>
                    ))}
                </div>
            </div>

            <div className="gis-metrics-row">
                <div className="gis-metric-card gis-metric-cfr">
                    <div className="gis-metric-label">Critical Fatality Rate (CFR)</div>
                    <div className="gis-metric-val">{cfr} %</div>
                </div>
                <div className="gis-metric-card gis-metric-prev">
                    <div className="gis-metric-label">Prevalence</div>
                    <div className="gis-metric-val">{prevalence} <span>Kasus per 10.000</span></div>
                </div>
            </div>

            <TrendChart penyakitId={penyakitId} wilayahId={wilayahId} tahun={tahun}
                onPenyakitChange={onPenyakitChange} penyakitList={penyakitList} />
        </div>
    );
};

// ─── Epidemiologi Table ───────────────────────────────────────────────────────

const badgeClass = (status: string) => ({
    Dirawat: 'dk-badge dk-badge-dirawat', Sembuh: 'dk-badge dk-badge-sembuh',
    Inactive: 'dk-badge dk-badge-inactive', Meninggal: 'dk-badge dk-badge-meninggal',
}[status] ?? 'dk-badge dk-badge-inactive');

// ─── Epidemiologi Table (Improved with GIS filters) ───────────────────────

const EpiTable: React.FC<{
    wilayahId: number | null;
    penyakitId: number | '';
    faskesId: number | null;
    periode: string;  // ← TAMBAHKAN: periode dari GIS filter
    onTotalCountChange?: (total: number) => void; // ← Opsional: untuk update total kasus
}> = ({ wilayahId, penyakitId, faskesId, periode, onTotalCountChange }) => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [selected, setSelected] = useState<Set<number>>(new Set());

    // UPDATE: Tambahkan periode ke parameter API
    const { data, loading, refetch } = useEpidemiologi({
        wilayah_id: wilayahId,
        penyakit_id: penyakitId,
        faskes_id: faskesId,
        periode: periode,  // ← TAMBAHKAN ini
        search,
        page,
        per_page: perPage,
    });

    // Auto-refetch ketika filter berubah
    useEffect(() => {
        setPage(1); // Reset ke halaman pertama
        refetch();
    }, [wilayahId, penyakitId, faskesId, periode, search, perPage]);

    // Update total count ke parent component
    useEffect(() => {
        if (data?.total && onTotalCountChange) {
            onTotalCountChange(data.total);
        }
    }, [data?.total]);

    const rows = data?.data ?? [];
    const total = data?.total ?? 0;
    const totalPages = data?.last_page ?? 1;
    const start = (page - 1) * perPage;
    const allSel = rows.length > 0 && rows.every((r: any) => selected.has(r.id));

    const toggleAll = (v: boolean) => setSelected(prev => {
        const n = new Set(prev);
        rows.forEach((r: any) => v ? n.add(r.id) : n.delete(r.id));
        return n;
    });

    const toggleRow = (id: number, v: boolean) => setSelected(prev => {
        const n = new Set(prev);
        v ? n.add(id) : n.delete(id);
        return n;
    });

    return (
        <div className="gis-epi-card">
            <div className="dk-card-header">
                <span className="dk-card-title">
                    Tabel Epidemiologi
                    {total > 0 && <span className="dk-total-badge">({total} data)</span>}
                </span>
                <div className="dk-header-right">
                    <button className="gis-filter-btn" onClick={() => refetch()}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M3 6h18M7 12h10m-6 6h2" />
                        </svg>
                    </button>
                    <div className="dk-search-wrap">
                        <svg className="dk-search-icon" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            className="dk-search"
                            placeholder="Cari penyakit..."
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Tampilkan filter aktif */}
            <div className="dk-active-filters">
                {(wilayahId || penyakitId || faskesId || periode) && (
                    <div className="dk-filter-badges">
                        <span className="dk-filter-label">Filter aktif:</span>
                        {periode && <span className="dk-filter-badge"> {periode}</span>}
                        {penyakitId && <span className="dk-filter-badge"> Penyakit terpilih</span>}
                        {wilayahId && <span className="dk-filter-badge"> Wilayah terpilih</span>}
                        {faskesId && <span className="dk-filter-badge"> Faskes terpilih</span>}
                    </div>
                )}
            </div>

            <div className="dk-table-wrap">
                <table className="dk-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" checked={allSel} onChange={e => toggleAll(e.target.checked)} /></th>
                            <th>#</th>
                            <th>PENYAKIT</th>
                            <th>TANGGAL</th>
                            <th>STATUS</th>
                            <th>USIA</th>
                            <th>JK</th>
                            <th>KECAMATAN</th>
                            <th>FASKES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} className="dk-empty-row">
                                <div className="dk-loading-spinner" />Memuat...
                            </td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={9} className="dk-empty-row">
                                Tidak ada data dengan filter yang dipilih
                            </td></tr>
                        ) : rows.map((row: any, i: number) => (
                            <tr key={row.id} className={selected.has(row.id) ? 'dk-row-selected' : ''}>
                                <td><input type="checkbox" checked={selected.has(row.id)}
                                    onChange={e => toggleRow(row.id, e.target.checked)} /></td>
                                <td className="dk-cell-num">{start + i + 1}</td>
                                <td>
                                    <div className="dk-disease-name">{row.penyakit}</div>
                                    <div className="dk-disease-code">{row.kode_icd}</div>
                                </td>
                                <td><div style={{ fontSize: 12 }}>{row.tanggal}</div></td>
                                <td><span className={badgeClass(row.status)}>{row.status}</span></td>
                                <td className="dk-cell-center">{row.usia} thn</td>
                                <td className="dk-cell-center">
                                    <span className={row.jk === 'L' ? 'dk-jk-l' : 'dk-jk-p'}>{row.jk}</span>
                                </td>
                                <td style={{ fontSize: 12 }}>{row.kecamatan}</td>
                                <td style={{ fontSize: 12 }}>{row.faskes || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="dk-pagination">
                <span style={{ fontSize: 12 }}>
                    {total === 0 ? 0 : start + 1}–{Math.min(start + perPage, total)} dari {total} data
                </span>
                <div className="dk-pagination-right">
                    <div className="dk-rows-sel">
                        <span>Baris per halaman:</span>
                        <select value={perPage} onChange={e => { setPerPage(+e.target.value); setPage(1); }}>
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
    );
};

// ─── Legenda Map ──────────────────────────────────────────────────────────────

const MapLegend: React.FC = () => (
    <div className="gis-legend">
        <div className="gis-legend-title">Tingkat Risiko</div>
        {[
            { color: CLUSTER_COLORS[2], label: 'Tinggi' },
            { color: CLUSTER_COLORS[1], label: 'Sedang' },
            { color: CLUSTER_COLORS[0], label: 'Rendah' },
            { color: '#e5e7eb', label: 'Belum diproses' },
        ].map(l => (
            <div key={l.label} className="gis-legend-row">
                <span className="gis-legend-swatch" style={{ background: l.color }} />
                <span>{l.label}</span>
            </div>
        ))}
    </div>
);

// ─── Toast Notification ───────────────────────────────────────────────────────

interface ToastState {
    type: 'success' | 'error';
    title: string;
    message: string;
}

const Toast: React.FC<{ toast: ToastState; onClose: () => void }> = ({ toast, onClose }) => {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => {
            setExiting(true);
            setTimeout(onClose, 280);
        }, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div className={`gis-toast gis-toast-${toast.type} ${exiting ? 'gis-toast-exiting' : ''}`}>
            <div className="gis-toast-icon">
                {toast.type === 'success' ? (
                    <svg width="16" height="16" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                ) : (
                    <svg width="16" height="16" fill="none" stroke="#dc2626" strokeWidth="2.5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                )}
            </div>
            <div className="gis-toast-content">
                <div className="gis-toast-title">{toast.title}</div>
                <div className="gis-toast-message">{toast.message}</div>
            </div>
            <button className="gis-toast-close" onClick={() => { setExiting(true); setTimeout(onClose, 280); }}>×</button>
        </div>
    );
};

// ─── Download Modal ───────────────────────────────────────────────────────────

interface DownloadModalProps {
    onClose: () => void;
    wilayahList: { id: number; nama_wilayah: string }[];
    faskesList: { id: number; nama_faskes: string }[];
    penyakitList: { id: number; nama_penyakit: string }[];
    onToast: (t: ToastState) => void;
}

// Sheet types untuk dipilih user
const SHEET_TYPES = [
    {
        key: 'epidemiologi',
        label: 'Data Epidemiologi',
        desc: 'Rekap kasus pasien',
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12h6M9 16h4" />
            </svg>
        ),
    },
    {
        key: 'clustering',
        label: 'Hasil Clustering',
        desc: 'Peta risiko wilayah',
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" /><circle cx="4" cy="6" r="2" /><circle cx="20" cy="6" r="2" />
                <circle cx="4" cy="18" r="2" /><circle cx="20" cy="18" r="2" />
                <path d="M6 6l4 4M14 14l4 4M6 18l4-4M14 10l4-4" />
            </svg>
        ),
    },
    {
        key: 'trend',
        label: 'Tren Penyakit',
        desc: 'Data per bulan / tahun',
        icon: (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
        ),
    },
];

const DownloadModal: React.FC<DownloadModalProps> = ({
    onClose, wilayahList, faskesList, penyakitList, onToast,
}) => {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1)
        .toISOString().slice(0, 7);

    const [wilayahId, setWilayahId] = useState<string>('');
    const [faskesId, setFaskesId] = useState<string>('');
    const [penyakitId, setPenyakitId] = useState<string>('');
    const [periodeAwal, setPeriodeAwal] = useState(threeMonthsAgo);
    const [periodeAkhir, setPeriodeAkhir] = useState(currentMonth);
    const [sheets, setSheets] = useState<Set<string>>(new Set(['epidemiologi']));
    const [loading, setLoading] = useState(false);

    const toggleSheet = (key: string) => {
        setSheets(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                if (next.size > 1) next.delete(key); // minimal 1 sheet dipilih
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleDownload = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (wilayahId) params.append('wilayah_id', wilayahId);
            if (faskesId) params.append('faskes_id', faskesId);
            if (penyakitId) params.append('penyakit_id', penyakitId);
            if (periodeAwal) params.append('periode_awal', periodeAwal);
            if (periodeAkhir) params.append('periode_akhir', periodeAkhir);
            sheets.forEach(s => params.append('sheets[]', s));

            const response = await api.get(`/gis/export-excel?${params.toString()}`, {
                responseType: 'blob',
            });

            // Buat link download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Nama file dari header Content-Disposition jika ada
            const contentDisposition = response.headers['content-disposition'];
            let filename = `GIS_Export_${periodeAwal}_sd_${periodeAkhir}.xlsx`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match) filename = match[1];
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            onToast({
                type: 'success',
                title: 'Download berhasil!',
                message: `File "${filename}" berhasil diunduh.`,
            });
            onClose();
        } catch {
            onToast({
                type: 'error',
                title: 'Download gagal',
                message: 'Terjadi kesalahan saat mengunduh data. Coba lagi.',
            });
        } finally {
            setLoading(false);
        }
    };

    // Filter faskes berdasarkan wilayah yang dipilih
    const filteredFaskes = wilayahId
        ? faskesList.filter((f: any) => String(f.wilayah_id) === wilayahId)
        : faskesList;

    return (
        <div className="gis-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="gis-modal">

                {/* Header */}
                <div className="gis-modal-header">
                    <div className="gis-modal-icon">
                        <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </div>
                    <div className="gis-modal-title-wrap">
                        <h3 className="gis-modal-title">Export Data GIS</h3>
                        <p className="gis-modal-subtitle">Unduh laporan dalam format Excel (.xlsx)</p>
                    </div>
                    <button className="gis-modal-close" onClick={onClose}>×</button>
                </div>

                {/* Body */}
                <div className="gis-modal-body">

                    {/* ── Sheet Type Selector ── */}
                    <div>
                        <div className="gis-modal-section-label">Data yang diekspor</div>
                        <div className="gis-sheet-types">
                            {SHEET_TYPES.map(st => (
                                <button
                                    key={st.key}
                                    className={`gis-sheet-type-btn ${sheets.has(st.key) ? 'gis-sheet-active' : ''}`}
                                    onClick={() => toggleSheet(st.key)}
                                >
                                    <div className="gis-sheet-type-icon">
                                        {React.cloneElement(st.icon, {
                                            stroke: sheets.has(st.key) ? '#fff' : '#94a3b8',
                                        })}
                                    </div>
                                    <span>{st.label}</span>
                                    <span style={{ fontSize: 10, fontWeight: 400, color: sheets.has(st.key) ? '#3b82f6' : '#94a3b8' }}>
                                        {st.desc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="gis-modal-divider" />

                    {/* ── Filter Wilayah & Faskes ── */}
                    <div>
                        <div className="gis-modal-section-label">Filter Lokasi</div>
                        <div className="gis-modal-grid">
                            {/* Wilayah */}
                            <div className="gis-modal-field">
                                <label className="gis-modal-field-label">
                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                                    </svg>
                                    Wilayah
                                </label>
                                <select
                                    className="gis-modal-select"
                                    value={wilayahId}
                                    onChange={e => { setWilayahId(e.target.value); setFaskesId(''); }}
                                >
                                    <option value="">Semua Wilayah</option>
                                    {wilayahList.map(w => (
                                        <option key={w.id} value={w.id}>{w.nama_wilayah}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Faskes */}
                            <div className="gis-modal-field">
                                <label className="gis-modal-field-label">
                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                                    </svg>
                                    Fasilitas Kesehatan
                                </label>
                                <select
                                    className="gis-modal-select"
                                    value={faskesId}
                                    onChange={e => setFaskesId(e.target.value)}
                                >
                                    <option value="">Semua Faskes</option>
                                    {filteredFaskes.map((f: any) => (
                                        <option key={f.id} value={f.id}>{f.nama_faskes}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Penyakit */}
                            <div className="gis-modal-field gis-modal-grid-full">
                                <label className="gis-modal-field-label">
                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                    </svg>
                                    Penyakit
                                </label>
                                <select
                                    className="gis-modal-select"
                                    value={penyakitId}
                                    onChange={e => setPenyakitId(e.target.value)}
                                >
                                    <option value="">Semua Penyakit</option>
                                    {penyakitList.map(p => (
                                        <option key={p.id} value={p.id}>{p.nama_penyakit}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="gis-modal-divider" />

                    {/* ── Filter Rentang Waktu ── */}
                    <div>
                        <div className="gis-modal-section-label">Rentang Waktu</div>
                        <div className="gis-modal-grid">
                            <div className="gis-modal-field">
                                <label className="gis-modal-field-label">
                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    Dari Periode
                                </label>
                                <input
                                    type="month"
                                    className="gis-modal-input"
                                    value={periodeAwal}
                                    max={periodeAkhir}
                                    onChange={e => setPeriodeAwal(e.target.value)}
                                />
                            </div>
                            <div className="gis-modal-field">
                                <label className="gis-modal-field-label">
                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    Sampai Periode
                                </label>
                                <input
                                    type="month"
                                    className="gis-modal-input"
                                    value={periodeAkhir}
                                    min={periodeAwal}
                                    onChange={e => setPeriodeAkhir(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="gis-modal-footer">
                    <p className="gis-modal-footer-info">
                        <strong>{sheets.size} sheet</strong> akan diekspor •{' '}
                        Format <strong>.xlsx</strong>
                    </p>
                    <button className="gis-modal-cancel-btn" onClick={onClose} disabled={loading}>
                        Batal
                    </button>
                    <button
                        className="gis-modal-download-btn"
                        onClick={handleDownload}
                        disabled={loading || !periodeAwal || !periodeAkhir}
                    >
                        {loading ? (
                            <>
                                <div className="gis-spinner" />
                                Mengunduh...
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Download Excel
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main GIS Page ────────────────────────────────────────────────────────────

const GIS: React.FC = () => {
    const today = new Date();
    const [periode, setPeriode] = useState(today.toISOString().slice(0, 7));
    const [tahun,] = useState(today.getFullYear());

    const [filterPenyakit, setFilterPenyakit] = useState<number | undefined>(undefined);
    const [selectedFaskesId, setSelectedFaskesId] = useState<number | null>(null);
    const [selectedWilayahId, setSelectedWilayahId] = useState<number | null>(null);
    const [penyakitList, setPenyakitList] = useState<any[]>([]);
    const [wilayahList, setWilayahList] = useState<any[]>([]);
    const [faskesList, setFaskesList] = useState<any[]>([]);
    const [isUserFilterApplied, setIsUserFilterApplied] = useState(false);

    // Download modal & toast state
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);

    const [clusteringStatus, setClusteringStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
    const lastClusteredRef = useRef<string>('');

    const { geojson, loading: geoLoading, refetch: refetchGeo } = useGeoJson(filterPenyakit, periode);
    const { faskesGeo } = useFaskesGeoJson();

    // ─── Load master data ──────────────────────────────────────────────────────
    useEffect(() => {
        api.get('/penyakit').then(r => setPenyakitList(r.data as any[])).catch(() => { });
        api.get('/wilayah').then(r => setWilayahList(r.data as any[])).catch(() => { });
        // Faskes list dari GeoJSON features yang sudah ada
    }, []);

    // Sync faskes list dari faskesGeo
    useEffect(() => {
        if (faskesGeo?.features) {
            const list = faskesGeo.features.map((f: any) => ({
                id: f.properties.id,
                nama_faskes: f.properties.nama_faskes,
                wilayah_id: f.properties.wilayah_id,
            }));
            setFaskesList(list);
        }
    }, [faskesGeo]);

    // ─── Auto-clustering ketika user memilih filter ────────────────────────────
    useEffect(() => {
        if (!isUserFilterApplied) return;
        if (!filterPenyakit) return;

        const key = `${filterPenyakit}-${periode}`;
        if (lastClusteredRef.current === key) return;

        setClusteringStatus('running');
        runClustering(filterPenyakit, periode, 3)
            .then(() => {
                lastClusteredRef.current = key;
                setClusteringStatus('done');
                refetchGeo();
            })
            .catch(() => {
                lastClusteredRef.current = key;
                setClusteringStatus('error');
                refetchGeo();
            });
    }, [filterPenyakit, periode, isUserFilterApplied, refetchGeo]);

    const handlePenyakitChange = useCallback((penyakitId: number | undefined) => {
        setFilterPenyakit(penyakitId);
        setIsUserFilterApplied(true);
        setClusteringStatus('idle');
    }, []);

    // ─── Style fungsi untuk GeoJSON wilayah ───────────────────────────────────
    const styleFeature = useCallback((feature?: any) => {
        const cId = feature?.properties?.cluster_id;
        const color = cId !== null && cId !== undefined ? CLUSTER_COLORS[cId] : '#e5e7eb';
        const isSelected = feature?.properties?.id === selectedWilayahId;
        return {
            fillColor: color,
            weight: isSelected ? 2.5 : 1,
            color: isSelected ? '#185FA5' : '#fff',
            fillOpacity: 0.72,
        };
    }, [selectedWilayahId]);

    const getTooltipText = useCallback((properties: any) => {
        const cId = properties.cluster_id;
        const isDefaultMode = !isUserFilterApplied || !filterPenyakit;
        const penyakitName = isDefaultMode
            ? 'Semua Penyakit'
            : (penyakitList.find(p => p.id === filterPenyakit)?.nama_penyakit ?? 'Penyakit');

        return `
            <div style="font-size:12px;min-width:160px;line-height:1.6">
                <strong style="font-size:13px">${properties.nama_wilayah}</strong><br/>
                <span style="color:#6b7280">Penyakit:</span> <b>${penyakitName}</b><br/>
                <span style="color:#6b7280">Jumlah Kasus:</span> <b>${properties.jumlah_kasus ?? 0}</b><br/>
                <span style="color:#6b7280">Status Risiko:</span> <b style="color:${cId !== null && cId !== undefined ? CLUSTER_TEXT[cId] : '#6b7280'}">${properties.cluster_label ?? 'Belum diproses'}</b>
            </div>
        `;
    }, [filterPenyakit, isUserFilterApplied, penyakitList]);

    const onEachFeature = useCallback((feature: any, layer: any) => {
        const p = feature.properties;

        layer.bindTooltip(getTooltipText(p), { sticky: true });

        layer.on({
            click: () => setSelectedWilayahId(p.id),
            mouseover: (e: any) => { e.target.setStyle({ weight: 2.5, color: '#185FA5', fillOpacity: 0.85 }); },
            mouseout: (e: any) => { e.target.setStyle(styleFeature(feature)); },
        });
    }, [styleFeature, getTooltipText]);

    return (
        <div className="gis-page">

            {/* ── Toast ─────────────────────────────────────────────────────────── */}
            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* ── Download Modal ────────────────────────────────────────────────── */}
            {showDownloadModal && (
                <DownloadModal
                    onClose={() => setShowDownloadModal(false)}
                    wilayahList={wilayahList}
                    faskesList={faskesList}
                    penyakitList={penyakitList}
                    onToast={t => setToast(t)}
                />
            )}

            {/* ── Top bar ───────────────────────────────────────────────────────── */}
            <div className="gis-topbar">
                <h2 className="gis-page-title">GIS</h2>
                <div className="gis-topbar-right">
                    {clusteringStatus === 'running' && (
                        <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="gis-spinner" style={{ width: 14, height: 14 }} />
                            Memproses clustering...
                        </span>
                    )}
                    {clusteringStatus === 'done' && (
                        <span style={{ fontSize: 12, color: '#166534', background: '#dcfce7', padding: '3px 10px', borderRadius: 12 }}>
                            ✓ Clustering selesai (K=3)
                        </span>
                    )}
                    <button className="gis-download-btn" onClick={() => setShowDownloadModal(true)}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                    </button>
                </div>
            </div>

            {/* ── Filter bar ────────────────────────────────────────────────────── */}
            <div className="gis-filterbar">
                <select
                    className="dk-filter-select"
                    value={filterPenyakit ?? ''}
                    onChange={e => {
                        const value = e.target.value;
                        handlePenyakitChange(value ? +value : undefined);
                    }}
                >
                    <option value="">-- Semua Penyakit --</option>
                    {penyakitList.map(p => <option key={p.id} value={p.id}>{p.nama_penyakit}</option>)}
                </select>
                <input
                    type="month"
                    className="dk-filter-select"
                    value={periode}
                    onChange={e => setPeriode(e.target.value)}
                    style={{ width: 180 }}
                />
            </div>

            {/* ── Main Layout ───────────────────────────────────────────────────── */}
            <div className="gis-main-layout">

                {/* Kolom kiri: Map + Tabel */}
                <div className="gis-left-col">

                    {/* Map */}
                    <div className="gis-map-wrap">
                        {(geoLoading || clusteringStatus === 'running') && (
                            <div className="gis-map-loading">
                                <div className="gis-spinner" />
                                {clusteringStatus === 'running' ? 'Menjalankan clustering...' : 'Memuat peta...'}
                            </div>
                        )}
                        <MapContainer
                            center={[-8.1845, 113.6679]}
                            zoom={12}
                            style={{ width: '100%', height: '100%' }}
                            zoomControl={true}
                        >
                            <LayersControl position="topright">
                                <LayersControl.BaseLayer checked name="OpenStreetMap">
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution="© OpenStreetMap contributors"
                                    />
                                </LayersControl.BaseLayer>
                                <LayersControl.BaseLayer name="Satelit (ESRI)">
                                    <TileLayer
                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                        attribution="Tiles © Esri — NOAA, USGS"
                                    />
                                </LayersControl.BaseLayer>
                            </LayersControl>

                            {geojson?.type === 'FeatureCollection' && Array.isArray(geojson.features) && (
                                <>
                                    <MapFit geojson={geojson} />
                                    <GeoJSON
                                        key={`${filterPenyakit ?? 'default'}-${periode}`}
                                        data={geojson as any}
                                        style={styleFeature}
                                        onEachFeature={onEachFeature}
                                    />
                                </>
                            )}

                            {Array.isArray(faskesGeo?.features) && faskesGeo!.features.map((f: any) => {
                                const coords = (f.geometry as any).coordinates;
                                if (!coords || coords.length < 2) return null;
                                const p = f.properties;
                                const isActive = selectedFaskesId === p.id;
                                return (
                                    <Marker
                                        key={p.id}
                                        position={[coords[1], coords[0]]}
                                        icon={faskesIcon(isActive)}
                                        eventHandlers={{
                                            click: () => {
                                                setSelectedFaskesId(p.id);
                                                setSelectedWilayahId(p.wilayah_id ?? null);
                                            }
                                        }}
                                    >
                                        <Popup>
                                            <div style={{ fontSize: 13, minWidth: 140 }}>
                                                <strong>{p.nama_faskes}</strong><br />
                                                <span style={{ color: '#6b7280' }}>{p.nama_wilayah}</span>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}

                            <MapLegend />
                        </MapContainer>
                    </div>

                    {/* Epidemiologi Table */}
                    <EpiTable
                        wilayahId={selectedWilayahId}
                        penyakitId={filterPenyakit ?? ''}
                        faskesId={selectedFaskesId}
                        periode={periode}  // ← TAMBAHKAN ini
                        onTotalCountChange={(total) => {
                            // Optional: update total kasus di state jika perlu
                            console.log(`Total kasus dengan filter: ${total}`);
                        }}
                    />
                </div>
                {/* Kolom kanan: Faskes Detail + Chart */}
                <div className="gis-right-col">
                    <FaskesDetailPanel
                        faskesId={selectedFaskesId}
                        periode={periode}
                        onClose={() => setSelectedFaskesId(null)}
                        penyakitId={filterPenyakit ?? ''}
                        wilayahId={selectedWilayahId}
                        tahun={tahun}
                        penyakitList={penyakitList}
                        onPenyakitChange={(id) => {
                            handlePenyakitChange(id || undefined);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default GIS;