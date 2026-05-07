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
    type ClusterRunResult,
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
                        <YAxis tick={{ fontSize: 11 }} />
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

    // FIX: jika detail null (API error), tampilkan pesan error daripada crash
    if (!detail) return (
        <div className="gis-detail-panel gis-detail-empty">
            <div className="gis-detail-hint">
                <p style={{ color: '#ef4444' }}>Gagal memuat detail faskes.<br />Coba klik marker lagi.</p>
            </div>
            <button className="gis-close-btn" style={{ position: 'relative', marginTop: 8 }} onClick={onClose}>× Tutup</button>
        </div>
    );

    // FIX: safe guard semua nilai yang mungkin null/undefined
    const populasi = detail.populasi ?? 0;
    const ir = detail.ir ?? 0;
    const cfr = detail.cfr ?? 0;
    const prevalence = detail.prevalence ?? 0;
    const kasusByPenyakit = detail.kasus_by_penyakit ?? [];

    return (
        <div className="gis-detail-panel">
            {/* Header */}
            <div className="gis-detail-header">
                <div>
                    <div className="gis-detail-label">Detail Fasilitas Kesehatan :</div>
                    <div className="gis-detail-title">{detail.nama_faskes}</div>
                </div>
                <button className="gis-close-btn" onClick={onClose}>×</button>
            </div>

            {/* Info rows */}
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

            {/* Total kasus */}
            <div className="gis-kasus-total-wrap">
                <div className="gis-kasus-total">
                    <div className="gis-kasus-total-num">{detail.total_kasus ?? 0}</div>
                    <div className="gis-kasus-total-label">Pasien</div>
                </div>
                <div className="gis-kasus-penyakit-chips">
                    {kasusByPenyakit.slice(0, 5).map((p, i) => (
                        <div key={i} className="gis-chip" style={{ color: DISEASE_COLORS[i] }}>
                            <span className="gis-chip-dot" style={{ background: DISEASE_COLORS[i] }} />
                            {p.total} Kasus <strong>{p.nama_penyakit}</strong>
                        </div>
                    ))}
                </div>
            </div>

            {/* CFR & Prevalence */}
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

            {/* Trend Chart */}
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

const EpiTable: React.FC<{
    wilayahId: number | null;
    penyakitId: number | '';
    faskesId: number | null;
}> = ({ wilayahId, penyakitId, faskesId }) => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [selected, setSelected] = useState<Set<number>>(new Set());

    const { data, loading } = useEpidemiologi({
        wilayah_id: wilayahId,
        penyakit_id: penyakitId,
        faskes_id: faskesId,
        search, page, per_page: perPage,
    });

    const rows = data?.data ?? [];
    const total = data?.total ?? 0;
    const totalPages = data?.last_page ?? 1;
    const start = (page - 1) * perPage;
    const allSel = rows.length > 0 && rows.every(r => selected.has(r.id));

    const toggleAll = (v: boolean) => setSelected(prev => { const n = new Set(prev); rows.forEach(r => v ? n.add(r.id) : n.delete(r.id)); return n; });
    const toggleRow = (id: number, v: boolean) => setSelected(prev => { const n = new Set(prev); v ? n.add(id) : n.delete(id); return n; });

    return (
        <div className="gis-epi-card">
            <div className="dk-card-header">
                <span className="dk-card-title">Tabel Epidemiologi</span>
                <div className="dk-header-right">
                    <button className="gis-filter-btn">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M7 12h10m-6 6h2" /></svg>
                    </button>
                    <div className="dk-search-wrap">
                        <svg className="dk-search-icon" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input className="dk-search" placeholder="Cari…" value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                </div>
            </div>

            <div className="dk-table-wrap">
                <table className="dk-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" checked={allSel} onChange={e => toggleAll(e.target.checked)} /></th>
                            <th>#</th><th>PENYAKIT</th><th>TANGGAL</th><th>STATUS</th>
                            <th>USIA</th><th>JK</th><th>KECAMATAN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="dk-empty-row"><div className="dk-loading-spinner" />Memuat...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={8} className="dk-empty-row">Tidak ada data</td></tr>
                        ) : rows.map((row, i) => (
                            <tr key={row.id} className={selected.has(row.id) ? 'dk-row-selected' : ''}>
                                <td><input type="checkbox" checked={selected.has(row.id)} onChange={e => toggleRow(row.id, e.target.checked)} /></td>
                                <td className="dk-cell-num">{start + i + 1}</td>
                                <td><div className="dk-disease-name">{row.penyakit}</div><div className="dk-disease-code">{row.kode_icd}</div></td>
                                <td><div style={{ fontSize: 12 }}>{row.tanggal}</div></td>
                                <td><span className={badgeClass(row.status)}>{row.status}</span></td>
                                <td className="dk-cell-center">{row.usia} thn</td>
                                <td className="dk-cell-center"><span className={row.jk === 'L' ? 'dk-jk-l' : 'dk-jk-p'}>{row.jk}</span></td>
                                <td style={{ fontSize: 12 }}>{row.kecamatan}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="dk-pagination">
                <span style={{ fontSize: 12 }}>{total === 0 ? 0 : start + 1}–{Math.min(start + perPage, total)} of {total}</span>
                <div className="dk-pagination-right">
                    <div className="dk-rows-sel">
                        <span>Rows per page:</span>
                        <select value={perPage} onChange={e => { setPerPage(+e.target.value); setPage(1); }}>
                            {[10, 25, 50].map(n => <option key={n}>{n}</option>)}
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

// ─── Main GIS Page ────────────────────────────────────────────────────────────

const GIS: React.FC = () => {
    const today = new Date();
    const [periode, setPeriode] = useState(today.toISOString().slice(0, 7));
    const [tahun, setTahun] = useState(today.getFullYear());
    const [filterPenyakit, setFilterPenyakit] = useState<number | ''>('');
    const [selectedFaskesId, setSelectedFaskesId] = useState<number | null>(null);
    const [selectedWilayahId, setSelectedWilayahId] = useState<number | null>(null);
    const [penyakitList, setPenyakitList] = useState<any[]>([]);

    // FIX: status auto-clustering
    const [clusteringStatus, setClusteringStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
    // Track penyakit+periode terakhir yang sudah di-cluster agar tidak double-run
    const lastClusteredRef = useRef<string>('');

    const { geojson, loading: geoLoading, refetch: refetchGeo } = useGeoJson(filterPenyakit, periode);
    const { faskesGeo } = useFaskesGeoJson();

    // ─── Load penyakit list & set default ke penyakit terbanyak ───────────────
    useEffect(() => {
        api.get('/penyakit').then(r => {
            const list = r.data as any[];
            setPenyakitList(list);
        }).catch(() => { });
    }, []);

    // Setelah penyakitList dan periode tersedia, cari penyakit dengan kasus terbanyak
    // untuk dijadikan default awal (hanya sekali saat load pertama)
    const defaultSet = useRef(false);
    useEffect(() => {
        if (defaultSet.current) return;
        if (penyakitList.length === 0) return;

        // Ambil summary kasus per penyakit untuk periode ini
        api.get('/gis/clustering/result', { params: { periode } })
            .then(res => {
                const results = res.data as any[];
                if (results.length === 0) {
                    // Belum ada cluster → pakai penyakit pertama di list
                    if (penyakitList[0]) {
                        setFilterPenyakit(penyakitList[0].id);
                    }
                } else {
                    // Cari penyakit dengan total kasus terbanyak dari hasil clustering
                    const totalByPenyakit: Record<string, number> = {};
                    results.forEach(r => {
                        const key = String(r.penyakit ?? r.penyakit_id ?? '');
                        totalByPenyakit[key] = (totalByPenyakit[key] ?? 0) + (r.jumlah_kasus ?? 0);
                    });
                    // Cocokan ke penyakitList
                    let maxId: number | '' = '';
                    let maxTotal = -1;
                    penyakitList.forEach(p => {
                        const t = totalByPenyakit[p.nama_penyakit] ?? 0;
                        if (t > maxTotal) { maxTotal = t; maxId = p.id; }
                    });
                    if (maxId !== '') setFilterPenyakit(maxId);
                    else if (penyakitList[0]) setFilterPenyakit(penyakitList[0].id);
                }
                defaultSet.current = true;
            })
            .catch(() => {
                // Jika gagal, fallback ke penyakit pertama
                if (penyakitList[0]) setFilterPenyakit(penyakitList[0].id);
                defaultSet.current = true;
            });
    }, [penyakitList, periode]);

    // ─── AUTO CLUSTERING: jalankan otomatis tiap kali penyakit atau periode berubah ─
    useEffect(() => {
        if (!filterPenyakit) return;

        const key = `${filterPenyakit}-${periode}`;
        if (lastClusteredRef.current === key) return; // sudah dicluster, skip

        setClusteringStatus('running');
        runClustering(+filterPenyakit, periode, 3)
            .then(() => {
                lastClusteredRef.current = key;
                setClusteringStatus('done');
                refetchGeo();
            })
            .catch(() => {
                // Jika gagal (misal tidak ada data), tetap refetch geojson
                // supaya peta tetap tampil dengan data yang ada
                lastClusteredRef.current = key;
                setClusteringStatus('error');
                refetchGeo();
            });
    }, [filterPenyakit, periode]);

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

    // ─── FIX: tooltip sekarang pakai nama penyakit dari filterPenyakit + jumlah penduduk ─
    // Kita ambil nama penyakit dari penyakitList berdasarkan filterPenyakit
    const selectedPenyakitNama = penyakitList.find(p => p.id === filterPenyakit)?.nama_penyakit ?? 'Semua Penyakit';

    // Event pada setiap polygon wilayah
    const onEachFeature = useCallback((feature: any, layer: any) => {
        const p = feature.properties;
        const cId = p.cluster_id;

        // FIX: gunakan selectedPenyakitNama untuk label penyakit
        // dan tampilkan jumlah kasus (sebagai proxy jumlah penduduk terdampak)
        layer.bindTooltip(`
      <div style="font-size:12px;min-width:160px;line-height:1.6">
        <strong style="font-size:13px">${p.nama_wilayah}</strong><br/>
        <span style="color:#6b7280">Penyakit:</span> <b>${selectedPenyakitNama}</b><br/>
        <span style="color:#6b7280">Jumlah Kasus:</span> <b>${p.jumlah_kasus ?? 0}</b><br/>
        <span style="color:#6b7280">Status Risiko:</span> <b style="color:${cId !== null && cId !== undefined ? CLUSTER_TEXT[cId] : '#6b7280'}">${p.cluster_label ?? 'Belum diproses'}</b>
      </div>
    `, { sticky: true });

        layer.on({
            click: () => setSelectedWilayahId(p.id),
            mouseover: (e: any) => { e.target.setStyle({ weight: 2.5, color: '#185FA5', fillOpacity: 0.85 }); },
            mouseout: (e: any) => { e.target.setStyle(styleFeature(feature)); },
        });
    }, [styleFeature, selectedPenyakitNama]);

    return (
        <div className="gis-page">

            {/* ── Top bar ───────────────────────────────────────────────────────── */}
            <div className="gis-topbar">
                <h2 className="gis-page-title">GIS</h2>
                <div className="gis-topbar-right">
                    {/* Indikator status auto-clustering */}
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
                    <button className="gis-download-btn">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                    </button>
                </div>
            </div>

            {/* ── Filter bar ────────────────────────────────────────────────────── */}
            {/* FIX: hapus tombol "⚙ Clustering K-Means" karena clustering sudah otomatis */}
            <div className="gis-filterbar">
                <select className="dk-filter-select" value={filterPenyakit}
                    onChange={e => {
                        setFilterPenyakit(e.target.value ? +e.target.value : '');
                        setClusteringStatus('idle'); // reset supaya auto-clustering trigger ulang
                    }}>
                    <option value="">Penyakit: All</option>
                    {penyakitList.map(p => <option key={p.id} value={p.id}>{p.nama_penyakit}</option>)}
                </select>
                <input type="month" className="dk-filter-select" value={periode}
                    onChange={e => {
                        setPeriode(e.target.value);
                        setClusteringStatus('idle'); // reset supaya auto-clustering trigger ulang
                    }}
                    style={{ width: 180 }} />
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
                            {/* Tile layers */}
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

                            {/* Wilayah GeoJSON */}
                            {geojson?.type === 'FeatureCollection' && Array.isArray(geojson.features) && (
                                <>
                                    <MapFit geojson={geojson} />
                                    <GeoJSON
                                        // FIX: key yang lebih unik agar GeoJSON re-render tiap cluster baru
                                        key={`${filterPenyakit}-${periode}-${geojson.features.length}`}
                                        data={geojson as any}
                                        style={styleFeature}
                                        onEachFeature={onEachFeature}
                                    />
                                </>
                            )}

                            {/* Faskes markers */}
                            {Array.isArray(faskesGeo?.features) && faskesGeo!.features.map(f => {
                                const coords = (f.geometry as any).coordinates;
                                // FIX: guard jika koordinat tidak valid
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
                                                {/* FIX: tampilkan nama_faskes, bukan nama_wilayah dua kali */}
                                                <strong>{p.nama_faskes}</strong><br />
                                                <span style={{ color: '#6b7280' }}>{p.nama_wilayah}</span>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}

                            {/* Legenda */}
                            <MapLegend />
                        </MapContainer>
                    </div>

                    {/* Epidemiologi Table */}
                    <EpiTable
                        wilayahId={selectedWilayahId}
                        penyakitId={filterPenyakit}
                        faskesId={selectedFaskesId}
                    />
                </div>

                {/* Kolom kanan: Faskes Detail + Chart */}
                <div className="gis-right-col">
                    <FaskesDetailPanel
                        faskesId={selectedFaskesId}
                        periode={periode}
                        onClose={() => setSelectedFaskesId(null)}
                        penyakitId={filterPenyakit}
                        wilayahId={selectedWilayahId}
                        tahun={tahun}
                        penyakitList={penyakitList}
                        onPenyakitChange={(id) => {
                            setFilterPenyakit(id);
                            setClusteringStatus('idle');
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default GIS;