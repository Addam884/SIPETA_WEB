# TODO - Perbaikan Anti Duplikat Data Wilayah

- [ ] Update `WilayahController` agar `POST /wilayah` menolak `nama_wilayah` yang sudah ada (case-insensitive)
- [x] Update `WilayahController` agar `PUT /wilayah/{id}` menolak duplikat `nama_wilayah` dengan record lain
- [x] Pastikan respon error memakai status 409 (Conflict) dan pesan jelas
- [x] Jalankan test manual: tambah wilayah duplikat dan pastikan gagal



