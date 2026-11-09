"""Check the deployed SONOTYPE Pages site in desktop and mobile Chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = "https://roki0i.github.io/SONOTYPE/"
OUT = Path("screenshots")
OUT.mkdir(exist_ok=True)


def check_desktop(browser):
    context = browser.new_context(viewport={"width": 1440, "height": 900}, color_scheme="light")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    response = page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    assert response and response.status == 200, "SONOTYPE home did not return HTTP 200"
    page.locator(".oto-hero").wait_for(state="visible", timeout=45000)
    gallery = page.locator("button.oto-home-template")
    assert gallery.count() == 5
    # Full-page screenshots do not necessarily trigger IntersectionObserver.
    # Visit each lazy thumbnail so the image represents the actual rendered UI.
    for index in range(5):
        card = gallery.nth(index)
        card.scroll_into_view_if_needed()
        card.locator(".template-preview > div").wait_for(state="visible", timeout=30000)
    page.locator(".oto-hero").scroll_into_view_if_needed()
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT / "sonotype-home.png"), full_page=True)

    page.locator("button.oto-main-cta").first.click()
    page.locator("button.template-card").first.wait_for(state="visible", timeout=45000)
    assert page.locator("button.template-card").count() == 5
    page.locator("button.template-card").nth(2).click()
    assert page.locator("button.template-card").nth(2).get_attribute("aria-pressed") == "true"
    page.locator("#export-availability").wait_for(state="visible", timeout=30000)
    page.screenshot(path=str(OUT / "sonotype-editor.png"), full_page=True)
    assert not errors, f"Browser JavaScript errors: {errors}"
    context.close()


def check_mobile(browser):
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
        color_scheme="light",
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    page.locator(".oto-hero").wait_for(state="visible", timeout=45000)
    overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    assert overflow <= 12, f"Mobile page overflows horizontally: {overflow}px"
    page.screenshot(path=str(OUT / "sonotype-mobile.png"), full_page=True)
    assert not errors, f"Mobile JavaScript errors: {errors}"
    context.close()


if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            check_desktop(browser)
            check_mobile(browser)
            print("Deployed SONOTYPE desktop/mobile smoke checks passed.")
        finally:
            browser.close()
