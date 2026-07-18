import { expect, test } from '@playwright/test';

test.describe('web smoke', () => {
  test('loads the public landing page', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/RoadMate/);
    await expect(page.getByText('U izradi')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Prijava' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Registracija' }),
    ).toBeVisible();
  });

  test('renders login and register screens', async ({ page }) => {
    await page.goto('/login');

    await expect(
      page.getByRole('heading', { name: 'Dobrodošao nazad' }),
    ).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Lozinka')).toBeVisible();

    await page.goto('/register');

    await expect(
      page.getByRole('heading', { name: 'Napravi račun' }),
    ).toBeVisible();
    await expect(page.getByLabel('Ime i prezime')).toBeVisible();
    await expect(page.getByLabel('Potvrdi lozinku')).toBeVisible();
  });

  test('redirects protected pages to login when signed out', async ({
    page,
  }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: 'Dobrodošao nazad' }),
    ).toBeVisible();
  });
});
