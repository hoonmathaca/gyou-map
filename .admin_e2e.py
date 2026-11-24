"""관리자 E2E — 신고 3건 확인 · 복구 · 리뷰 숨김/복구 · 가게 삭제. 360px 스크린샷도 이 때 찍는다."""
import re
import time
from playwright.sync_api import sync_playwright

BASE = "https://gyou-map.vercel.app"

def log(*a):
    print("[admin]", *a, flush=True)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 360, "height": 812}, device_scale_factor=2,
                        locale="ko-KR", timezone_id="Asia/Seoul")
    page = ctx.new_page()
    page.on("dialog", lambda d: (log("dialog:", d.message), d.accept()))

    page.goto(f"{BASE}/admin", wait_until="networkidle")
    page.fill("input[type=password]", "0801")
    page.get_by_role("button", name="들어가기").click()
    page.wait_for_timeout(3500)
    body = page.inner_text("body")
    log("header:", body.split("\n")[1] if "\n" in body else body[:80])

    # 신고 탭 (3건)
    page.get_by_role("button", name=re.compile("^신고 ")).click()
    page.wait_for_timeout(1000)
    reports_text = page.inner_text("main")
    log("reports:", reports_text.replace("\n", " | ")[:200])
    page.screenshot(path="/workspace/browser/e2e-admin-reports-360.png", full_page=True)

    # 가게 탭 → 숨김 상태 확인 → 복구
    page.get_by_role("button", name=re.compile("^가게 ")).click()
    page.wait_for_timeout(1200)
    log("place row:", page.inner_text("main").replace("\n", " | ")[:220])
    page.screenshot(path="/workspace/browser/e2e-admin-place-360.png", full_page=True)
    page.get_by_role("button", name="복구").first.click()
    page.wait_for_timeout(2500)
    log("after restore:", page.inner_text("main").replace("\n", " | ")[:200])

    # 복구 후 지도(360px) — 마커가 보이는 메인 화면
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_timeout(3500)
    log("markers:", page.locator(".gyou-pin").count())
    page.locator(".gyou-pin").first.click()
    page.wait_for_timeout(1200)
    page.screenshot(path="/workspace/downloads/gyou-map-360.png")
    page.screenshot(path="/workspace/browser/e2e-map-360-full.png", full_page=True)
    # 목록 탭
    page.get_by_role("button", name="목록").click()
    page.wait_for_timeout(1200)
    page.screenshot(path="/workspace/browser/e2e-list-360.png", full_page=True)

    # 관리자: 리뷰 숨김 → 복구
    page.goto(f"{BASE}/admin", wait_until="networkidle")
    page.wait_for_timeout(2500)
    page.get_by_role("button", name=re.compile("^리뷰 ")).click()
    page.wait_for_timeout(1000)
    log("review tab:", page.inner_text("main").replace("\n", " | ")[:160])
    page.get_by_role("button", name="숨김").first.click()
    page.wait_for_timeout(2500)
    log("after review hide:", page.inner_text("main").replace("\n", " | ")[:160])
    page.get_by_role("button", name="복구").first.click()
    page.wait_for_timeout(2500)
    log("after review restore:", page.inner_text("main").replace("\n", " | ")[:160])

    # 관리자: 가게 삭제 (확인 대화상자 수락)
    page.get_by_role("button", name=re.compile("^가게 ")).click()
    page.wait_for_timeout(1000)
    page.get_by_role("button", name="삭제").first.click()
    page.wait_for_timeout(3000)
    log("after delete:", page.inner_text("main").replace("\n", " | ")[:200])
    page.screenshot(path="/workspace/browser/e2e-admin-after-delete-360.png", full_page=True)

    b.close()
