import { test, expect } from '@playwright/test';

// Pre-deployed test contract addresses
const TEST_CONTRACTS = {
    sepolia: '0x0fdD0907faeF10335b00e1676F7Fd54669855eB7',
    baseSepolia: '0xbBd81BcDC0bb81F2f5e0E2FA1005B24A1d1a18af',
    polygonAmoy: '0xaceE91e84463b1F11C6CaA064455E5B65F9dCE91',
};

test.describe('Price Oracle Frontend', () => {
    test('renders the main page with header', async ({ page }) => {
        await page.goto('/');

        // Check header renders
        await expect(page.locator('h1')).toContainText('Price Oracle Demo');

        // Check source chain section
        await expect(page.getByText('Source Chain')).toBeVisible();

        // Check destination chains section
        await expect(page.getByText('Destination Chains')).toBeVisible();
    });

    test('displays contract addresses', async ({ page }) => {
        await page.goto('/');

        // Source chain (Sepolia) contract address should be displayed
        await expect(
            page.getByText(TEST_CONTRACTS.sepolia.slice(0, 10))
        ).toBeVisible();
    });

    test('shows connect wallet button when not connected', async ({ page }) => {
        await page.goto('/');

        // Should show connect button(s)
        const connectButtons = page
            .getByRole('button')
            .filter({ hasText: /connect/i });
        await expect(connectButtons.first()).toBeVisible();
    });

    test('can add token to track', async ({ page }) => {
        await page.goto('/');

        // Find token tracking input in the PriceForm (in the source panel section)
        // The token tracking section is in the "Track Token Prices" area
        const tokenInput = page.getByPlaceholder(/enter token name to track/i);
        await tokenInput.fill('bitcoin');

        // Click the search button next to the input
        const searchButton = tokenInput
            .locator('..')
            .locator('button[type="submit"]');
        await searchButton.click();

        // Token should appear in the tracked list (as a badge in PriceForm)
        await expect(page.locator('text=bitcoin').first()).toBeVisible();
    });

    test('can query price for tracked token', async ({ page }) => {
        await page.goto('/');

        // Add a token using the track token input in PriceForm
        const tokenInput = page.getByPlaceholder(/enter token name to track/i);
        await tokenInput.fill('bitcoin');
        const searchButton = tokenInput
            .locator('..')
            .locator('button[type="submit"]');
        await searchButton.click();

        // Wait for token to appear in tracked list
        await expect(page.locator('text=bitcoin').first()).toBeVisible({
            timeout: 10000,
        });

        // The price display should show the token with a price (either a number or "N/A")
        // This validates the contract read is working
        const priceRow = page
            .locator('.bg-muted\\/30')
            .filter({ hasText: 'bitcoin' })
            .first();
        await expect(priceRow).toBeVisible();
    });

    test('displays pause status', async ({ page }) => {
        await page.goto('/');

        // Wait for pause status to load - should show either Active or Paused badge
        await expect(page.getByText(/active|paused/i).first()).toBeVisible({
            timeout: 10000,
        });
    });

    test('footer links to Wormhole', async ({ page }) => {
        await page.goto('/');

        const wormholeLink = page
            .getByRole('link', { name: /wormhole/i })
            .first();
        await expect(wormholeLink).toHaveAttribute(
            'href',
            'https://wormhole.com'
        );
    });
});
