// src/hooks/useKasus.ts
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Penyakit {
  id: number;
  nama_penyakit: string;
  kode_icd: string;
  kategori: string;
  threshold_ews: number;
}

export interface Faskes {
  id: number;
  nama_faskes: string;
  wilayah_id: number;
}


export interface Wilayah {
  id: number;
  nama_wilayah: string;
  level: string;
  parent_id: number | null;
}

export interface KasusRow {
  id: number;
  penyakit_id: number;
  wilayah_id: number;
  faskes_id: number | null; // Tambahkan ini
  penyakit: string;
  kode_icd: string;
  tanggal: string;
  status: 'Dirawat' | 'Sembuh' | 'Inactive' | 'Meninggal';
  usia: number;
  jk: 'L' | 'P';
  kecamatan: string;
  faskes: string;
}
export interface KasusForm {
  penyakit_id: number | '';
  wilayah_id: number | '';
  faskes_id?: number | '';
  tanggal_kasus: string;
  umur: number | '';
  jenis_kelamin: 'L' | 'P';
  status: 'Dirawat' | 'Sembuh' | 'Inactive' | 'Meninggal';
}

export interface ImportRow {
  penyakit_id: number;
  wilayah_id: number;
  faskes_id?: number;
  tanggal_kasus: string;
  umur: number;
  jenis_kelamin: 'L' | 'P';
  status: 'Dirawat' | 'Sembuh' | 'Inactive' | 'Meninggal';
}

export interface PaginatedKasus {
  data: KasusRow[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface KasusFilters {
  search?: string;
  penyakit_id?: number | '';
  wilayah_id?: number | '';
  status?: string;
  tanggal_mulai?: string;   // tambahkan
  tanggal_akhir?: string;   // tambahkan
  per_page?: number;
  page?: number;
}

// ─── Statistik Types ──────────────────────────────────────────────────────────
 
export interface StatItem {
  nama_penyakit?: string;
  nama_faskes?: string;
  kode_icd?: string;
  total: number;
}
 
export interface Statistik {
  bulan: string;
  tahun: number;
  total_kasus: number;
  total_dirawat: number;
  total_sembuh: number;
  total_meninggal: number;
  penyakit_terbanyak: StatItem[];
  faskes_terbanyak: StatItem[];
  kasus_by_penyakit: StatItem[];
}

export interface BulkDeleteResponse {
  success: boolean;
  message: string;
  data: {
    total_requested: number;
    total_deleted: number;
    deleted_ids: number[];
  };
}


export const emptyForm = (): KasusForm => ({
  penyakit_id: '',
  wilayah_id: '',
  faskes_id: '',
  tanggal_kasus: '',
  umur: '',
  jenis_kelamin: 'L',
  status: 'Dirawat',
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useKasus = (filters: KasusFilters = {}) => {
  const [kasusData, setKasusData]     = useState<PaginatedKasus | null>(null);
  const [penyakitList, setPenyakitList] = useState<Penyakit[]>([]);
  const [wilayahList, setWilayahList]   = useState<Wilayah[]>([]);
  const [loading, setLoading]           = useState(false);
  const [loadingDropdown, setLoadingDropdown] = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // ── Fetch tabel kasus ──────────────────────────────────────────────────────
  const fetchKasus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined)
      );
      const res = await api.get('/kasus', { params });
      setKasusData(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Gagal memuat data kasus');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  // ── Fetch dropdown penyakit & wilayah (sekali saja) ────────────────────────
  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdown(true);
    try {
      const [pRes, wRes] = await Promise.all([
        api.get('/penyakit'),
        api.get('/wilayah'),
      ]);
      setPenyakitList(pRes.data);
      setWilayahList(wRes.data);
    } catch {
      // dropdown gagal tidak block halaman
    } finally {
      setLoadingDropdown(false);
    }
  }, []);

  useEffect(() => { fetchKasus(); }, [fetchKasus]);
  useEffect(() => { fetchDropdowns(); }, [fetchDropdowns]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const createKasus = async (form: KasusForm): Promise<void> => {
    try {
      const payload = {
        penyakit_id: Number(form.penyakit_id),
        wilayah_id: Number(form.wilayah_id),
        faskes_id: form.faskes_id ? Number(form.faskes_id) : null,
        tanggal_kasus: form.tanggal_kasus,
        umur: Number(form.umur),
        jenis_kelamin: form.jenis_kelamin,
        status: form.status,
      };
      
      console.log('Create payload:', payload); // Debug
      
      const response = await api.post('/kasus', payload);
      console.log('Create response:', response); // Debug
      
      await fetchKasus();
    } catch (error) {
      console.error('Create error:', error); // Debug
      throw error;
    }
  };

  const updateKasus = async (id: number, form: KasusForm): Promise<void> => {
    try {
      const payload = {
        penyakit_id: Number(form.penyakit_id),
        wilayah_id: Number(form.wilayah_id),
        faskes_id: form.faskes_id ? Number(form.faskes_id) : null,
        tanggal_kasus: form.tanggal_kasus,
        umur: Number(form.umur),
        jenis_kelamin: form.jenis_kelamin,
        status: form.status,
      };
      
      console.log('Update payload:', payload); // Debug
      
      const response = await api.put(`/kasus/${id}`, payload);
      console.log('Update response:', response); // Debug
      
      await fetchKasus();
    } catch (error) {
      console.error('Update error:', error); // Debug
      throw error;
    }
  };

  const deleteKasus = async (id: number): Promise<void> => {
    await api.delete(`/kasus/${id}`);
    await fetchKasus();
  };

  // Usekasus.ts – di dalam hook useKasus
const bulkDeleteKasus = async (ids: number[]): Promise<BulkDeleteResponse> => {
  try {
    const response = await api.delete('/kasus/bulkDelete', {
      data: { ids }  // axios akan kirim sebagai body JSON
    });
    await fetchKasus();   // refresh tabel
    return response.data;
  } catch (error: any) {
    console.error('Bulk delete error:', error.response?.data);
    const serverMessage =
    error.response?.data?.message ||
    error.response?.data?.error || 
    'Gagal menghapus data (tidak ada respons dari server)';
    console.error('❌ Bulk delete gagal:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      serverMessage,
      validationErrors: error.response?.data?.errors,
      config: error.config,
    });

    // Buat error baru dengan pesan yang informatif
    throw new Error(serverMessage);
   // dilempar ke pemanggil agar toast error bisa tampil
  }
}; 

  // ── Bulk Import ─────────────────────────────────────────────────────────────
  // Mengirim rows dalam chunks 500 supaya tidak timeout
  const bulkImportKasus = async (
    rows: ImportRow[],
    onProgress?: (done: number, total: number) => void
  ): Promise<{ success: number; failed: number }> => {
    const CHUNK = 500;
    let success = 0;
    let failed  = 0;
    const chunks: ImportRow[][] = [];
 
    for (let i = 0; i < rows.length; i += CHUNK) {
      chunks.push(rows.slice(i, i + CHUNK));
    }
 
    for (let i = 0; i < chunks.length; i++) {
      try {
        const res = await api.post('/kasus/import', { rows: chunks[i] });
        success += res.data.total ?? chunks[i].length;
      } catch {
        failed += chunks[i].length;
      }
      onProgress?.(Math.min((i + 1) * CHUNK, rows.length), rows.length);
    }
 
    await fetchKasus();
    return { success, failed };
  };
 
  return {
    kasusData,
    penyakitList,
    wilayahList,
    loading,
    loadingDropdown,
    error,
    refetch: fetchKasus,
    createKasus,
    updateKasus,
    deleteKasus,
    bulkDeleteKasus,
    bulkImportKasus,
  };
};
 
// ─── useStatistik Hook ────────────────────────────────────────────────────────
 
export const useStatistik = (bulan?: string, tahun?: number) => {
  const [statistik, setStatistik] = useState<Statistik | null>(null);
  const [loading, setLoading]     = useState(false);
 
  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/kasus/statistik', {
        params: {
          bulan: bulan ?? new Date().toISOString().slice(0, 7),
          tahun: tahun ?? new Date().getFullYear(),
        },
      });
      setStatistik(res.data);
    } catch {
      // silent fail — cards akan tampil dengan 0
    } finally {
      setLoading(false);
    }
  }, [bulan, tahun]);
 
  useEffect(() => { fetch(); }, [fetch]);
 
  return { statistik, loading, refetch: fetch };
};