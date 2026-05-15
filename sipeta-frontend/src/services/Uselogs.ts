// src/services/useLogs.ts
import { useState, useEffect, useCallback } from 'react';
import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KasusLogRow {
  id: number;
  aksi: 'Tambah' | 'Edit' | 'Hapus';
  timestamp: string;
  keterangan: string | null;
  ip_address: string | null;
  avatar?: string | null;
  kasus_id: number | null;
  tanggal_kasus: string | null;
  umur: number | null;
  jenis_kelamin: 'L' | 'P' | null;
  status_kasus: string | null;
  nama_penyakit: string | null;
  kode_icd: string | null;
  nama_wilayah: string | null;
  nama_user: string | null;
  role_user: string | null;
  data_before: Record<string, any> | null;
  data_after: Record<string, any> | null;
}

export interface AktivitasRow {
  id: number;
  aktivitas: string;
  modul: string;
  deskripsi: string | null;
  ip_address: string | null;
  timestamp: string;
  nama_user: string | null;
  email: string | null;
  role_user: string | null;
  avatar?: string | null;
}

export interface FileLogRow {
  id: number;
  nama_file: string;
  nama_asli: string | null;
  jenis_file: string | null;
  tipe_aksi: 'import' | 'export';
  jumlah_data: number | null;
  status: string | null;
  keterangan: string | null;
  ukuran_file: number | null;
  tanggal_upload: string;
  nama_user: string | null;
  role_user: string | null;
  avatar?: string | null;
}

export interface LogSummary {
  kasus_hari_ini: number;
  aktivitas_hari_ini: number;
  import_hari_ini: number;
  export_hari_ini: number;
  tambah_bulan_ini: number;
  edit_bulan_ini: number;
  hapus_bulan_ini: number;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface KasusLogFilters {
  search?: string;
  aksi?: string;
  penyakit_id?: number | '';
  wilayah_id?: number | '';
  from?: string;
  to?: string;
  per_page?: number;
  page?: number;
}

export interface AktivitasFilters {
  search?: string;
  modul?: string;
  user_id?: number | '';
  from?: string;
  to?: string;
  per_page?: number;
  page?: number;
}

export interface FileFilters {
  search?: string;
  tipe_aksi?: string;
  status?: string;
  from?: string;
  to?: string;
  per_page?: number;
  page?: number;
}

// ─── Generic paginated fetch hook ────────────────────────────────────────────

function usePaginated<T, F extends Record<string, any>>(
  endpoint: string,
  filters: F
) {
  const [data, setData]       = useState<Paginated<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined && v !== null)
      );
      const res = await api.get(endpoint, { params });
      setData(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

// ─── Exported hooks ───────────────────────────────────────────────────────────

export const useKasusLog = (filters: KasusLogFilters) =>
  usePaginated<KasusLogRow, KasusLogFilters>('/logs/kasus', filters);

export const useAktivitasLog = (filters: AktivitasFilters) =>
  usePaginated<AktivitasRow, AktivitasFilters>('/logs/aktivitas', filters);

export const useFileLog = (filters: FileFilters) =>
  usePaginated<FileLogRow, FileFilters>('/logs/file', filters);

export const useLogSummary = () => {
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/logs/summary')
      .then(r => setSummary(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { summary, loading };
};