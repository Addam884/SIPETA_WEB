import { test, expect } from '@playwright/test';

test('navigasi halaman lengkap dan logout', async ({ page }) => {
  await page.goto('http://103.157.27.220:5173/login', {
  timeout: 60000, // 60 detik
});

  // =====================
  // LOGIN
  // =====================
  await page.getByPlaceholder('nama@email.com').fill('super@gmail.com');
  await page.getByPlaceholder('Masukkan password...').fill('123456');
  await page.getByRole('button', { name: 'Masuk' }).click();

  await page.waitForURL(/dashboard/);

  await expect(
    page.getByRole('heading', { name: 'Dashboard', level: 1 })
  ).toBeVisible();

  await page.waitForTimeout(5000);

  // =====================
  // GIS
  // =====================
  await page.getByRole('button', { name: 'GIS' }).click();
  await page.waitForURL(/gis/);

  await expect(
    page.getByRole('heading', { name: 'GIS', level: 1 })
  ).toBeVisible();

  await page.waitForTimeout(5000);

  // =====================
  // DATA KASUS
  // =====================
  await page.getByRole('button', { name: 'Data Kasus' }).click();
  await page.waitForURL(/datakasus/);

  await expect(
    page.getByRole('heading', { name: 'Data Kasus', level: 1 })
  ).toBeVisible();

  await page.waitForTimeout(5000);

  // =====================
  // SETTINGS
  // =====================
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.waitForURL(/settings/);

  await expect(
    page.getByRole('heading', { name: 'Settings', level: 1 })
  ).toBeVisible();

  await page.waitForTimeout(2000);

  // =====================
  // LOGOUT
  // =====================
  await page.getByRole('button', { name: 'Logout' }).click();

  // SweetAlert confirm
  await page.getByRole('button', { name: 'Ya, Logout' }).click();

  await expect(page).toHaveURL(/login/);

  // 🔥 biar tidak langsung hilang saat demo
  await page.waitForTimeout(2000);
});