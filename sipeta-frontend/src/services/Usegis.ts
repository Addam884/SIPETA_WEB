// src/services/useGis.ts
import { useState, useEffect, useCallback } from 'react';
import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: object;
  properties: {
    id: number;
    wilayah_id: number;
    nama_faskes: string;
    nama_wilayah: string;
    jumlah_kasus: number;
    cluster_id: number | null;
    cluster_label: string;
    cluster_color: string;
    centroid?: number;
  };
}

export interface FaskesDetail {
  id: number;
  nama_faskes: string;
  nama_wilayah: string;
  latitude: number;
  longitude: number;
  populasi: number;
  total_kasus: number;
  ir: number;
  cfr: number;
  prevalence: number;
  kasus_by_penyakit: { nama_penyakit: string; kode_icd: string; total: number }[];
}

export interface ClusteringResult {
  wilayah_id: number;
  nama_wilayah: string;
  penyakit: string;
  jumlah_kasus: number;
  cluster_id: number;
  cluster_label: 'Rendah' | 'Sedang' | 'Tinggi';
  centroid: number;
}

export interface TrendData {
  labels: string[];
  datasets: { label: string; data: number[]; backgroundColor: string }[];
  tahun: number;
}

export interface EpiRow {
  id: number;
  penyakit: string;
  kode_icd: string;
  tanggal: string;
  status: string;
  usia: number;
  jk: 'L' | 'P';
  kecamatan: string;
  faskes: string | null;
}

export interface PaginatedEpi {
  data: EpiRow[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface ClusterRunResult {
  message: string;
  k: number;
  total_wilayah: number;
  centroids: Record<number, number>;
  davies_bouldin: number;
  summary: { Rendah: number; Sedang: number; Tinggi: number };
}

// ─── Hook: useGeoJson ─────────────────────────────────────────────────────────

export const useDefaultGeoJson = (periode?: string) => {
  const [geojson, setGeojson] = useState<GeoJsonFeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [clusteringInfo, setClusteringInfo] = useState<{
    k: number;
    davies_bouldin: number;
    summary: { Rendah: number; Sedang: number; Tinggi: number };
  } | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      // Endpoint baru untuk clustering berdasarkan total kasus semua penyakit
      const res = await api.get('/gis/geojson/default-clustering', {
        params: {
          periode: periode ?? new Date().toISOString().slice(0, 7),
        },
      });
      setGeojson(res.data.geojson);
      setClusteringInfo({
        k: res.data.k,
        davies_bouldin: res.data.davies_bouldin,
        summary: res.data.summary,
      });
    } catch (error) {
      console.error('Error fetching default clustering:', error);
    } finally {
      setLoading(false);
    }
  }, [periode]);

  useEffect(() => { fetch(); }, [fetch]);

  return { geojson, loading, clusteringInfo, refetch: fetch };
};

// ─── Modified: Hook untuk GeoJson berdasarkan penyakit (opsional) ───
export const useGeoJson = (penyakitId?: number | '', periode?: string) => {
  const [geojson, setGeojson] = useState<GeoJsonFeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [clusteringInfo, setClusteringInfo] = useState<{
    k: number;
    davies_bouldin: number;
    summary: { Rendah: number; Sedang: number; Tinggi: number };
  } | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/gis/geojson', {
        params: {
          penyakit_id: penyakitId || undefined,
          periode: periode ?? new Date().toISOString().slice(0, 7),
        },
      });
      setGeojson(res.data.geojson || res.data);
      if (res.data.clustering_info) {
        setClusteringInfo(res.data.clustering_info);
      }
    } catch (error) {
      console.error('Error fetching geoJSON:', error);
    } finally {
      setLoading(false);
    }
  }, [penyakitId, periode]);

  useEffect(() => { fetch(); }, [fetch]);

  return { geojson, loading, clusteringInfo, refetch: fetch };
};


// ─── Hook: useFaskesGeoJson ───────────────────────────────────────────────────

export const useFaskesGeoJson = () => {
  const [faskesGeo, setFaskesGeo] = useState<GeoJsonFeatureCollection | null>(null);

  useEffect(() => {
    api.get('/gis/faskes').then(r => setFaskesGeo(r.data)).catch(() => { });
  }, []);

  return { faskesGeo };
};

// ─── Hook: useFaskesDetail ────────────────────────────────────────────────────

export const useFaskesDetail = (faskesId: number | null, periode?: string) => {
  const [detail, setDetail] = useState<FaskesDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!faskesId) {
      setDetail(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    api.get(`/gis/faskes/${faskesId}/detail`, { params: { periode } })
      .then(r => {
        console.log('Faskes detail response:', r.data); // Debug log
        setDetail(r.data);
      })
      .catch(err => {
        console.error('Faskes detail error:', err);
        setError(err.response?.data?.message || err.message || 'Gagal memuat data');
        setDetail(null);
      })
      .finally(() => setLoading(false));
  }, [faskesId, periode]);

  return { detail, loading, error };
};

// ─── Hook: useTrend ───────────────────────────────────────────────────────────

export const useTrend = (penyakitId?: number | '', wilayahId?: number | '', tahun?: number) => {
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/gis/trend', {
        params: {
          penyakit_id: penyakitId || undefined,
          wilayah_id: wilayahId || undefined,
          tahun: tahun ?? new Date().getFullYear(),
        },
      });
      setTrend(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [penyakitId, wilayahId, tahun]);

  useEffect(() => { fetch(); }, [fetch]);
  return { trend, loading, refetch: fetch };
};

// ─── Hook: useEpidemiologi ────────────────────────────────────────────────────

// useEpidemiologi - Update dengan parameter periode
export const useEpidemiologi = (params: {
    wilayah_id?: number | null;
    penyakit_id?: number | '';
    faskes_id?: number | null;
    periode?: string;  // ← TAMBAHKAN
    search?: string;
    page?: number;
    per_page?: number;
}) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (params.wilayah_id) queryParams.append('wilayah_id', String(params.wilayah_id));
            if (params.penyakit_id) queryParams.append('penyakit_id', String(params.penyakit_id));
            if (params.faskes_id) queryParams.append('faskes_id', String(params.faskes_id));
            if (params.periode) queryParams.append('periode', params.periode); // ← TAMBAHKAN
            if (params.search) queryParams.append('search', params.search);
            if (params.page) queryParams.append('page', String(params.page));
            if (params.per_page) queryParams.append('per_page', String(params.per_page));
            
            const response = await api.get(`/gis/epidemiologi?${queryParams.toString()}`);
            setData(response.data);
        } catch (err) {
            setError('Gagal memuat data epidemiologi');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [params.wilayah_id, params.penyakit_id, params.faskes_id, params.periode, params.search, params.page, params.per_page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
};

// ─── Clustering helpers ───────────────────────────────────────────────────────

export const runClustering = async (
  penyakitId: number,
  periode: string,
  k = 3
): Promise<ClusterRunResult> => {
  const res = await api.post('/gis/clustering/run', { penyakit_id: penyakitId, periode, k });
  return res.data;
};

export const fetchClusteringResult = async (
  penyakitId?: number,
  periode?: string
): Promise<ClusteringResult[]> => {
  const res = await api.get('/gis/clustering/result', {
    params: { penyakit_id: penyakitId, periode },
  });
  return res.data;
};