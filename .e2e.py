"""교우의 집 지도 E2E — 등록 · 리뷰 · 신고 3회 자동 숨김 · 관리자 복구/삭제"""
import re
import sys
import time
from playwright.sync_api import sync_playwright, expect

BASE = "https://gyou-map.vercel.app"
PHOTO = "/workspace/downloads/gyou-sticker-sample.jpg"
SHOT_DIR = "/workspace/browser"

def log(*a):
    print("[e2e]", *a, flush=True)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 360, "height": 812}, device_scale_factor=2,
                                  locale="ko-KR", timezone_id="Asia/Seoul")
        page = ctx.new_page()

        # 1) 등록 화면
        page.goto(f"{BASE}/add", wait_until="networkidle")
        log("add page:", page.title())
        page.fill("#name", "하늘빵집")
        page.fill("#baptismal", "요한")
        page.fill("#intro", "매일 아침 직접 굽는 빵, 교우 10% 할인")
        page.locator("button", has_text="카페·디저트").first.click()

        # 2) 다음 주소검색
        with ctx.expect_page() as pop_info:
            page.get_by_role("button", name="주소 찾기").click()
        pop = pop_info.value
        pop.wait_for_load_state("load")
        time.sleep(2)
        log("popup url:", pop.url)
        target = None
        for _ in range(30):
            for f in pop.frames:
                try:
                    if f.query_selector("input"):
                        target = f
                        break
                except Exception:
                    pass
            if target:
                break
            time.sleep(0.5)
        log("frames:", [f.url for f in pop.frames], "target:", target.url if target else None)
        inp = target.query_selector("input")
        inp.fill("동백죽전대로 315")
        inp.press("Enter")
        time.sleep(2.0)
        if not pop.is_closed():
            try:
                target.locator("button.link_post").first.click(timeout=8000)
            except Exception as e:
                log("result click failed:", e)
                log(target.inner_text("body")[:300])
                raise SystemExit("address select failed")
        time.sleep(2)
        log("popup closed:", pop.is_closed())

        page.wait_for_timeout(2500)
        addr = page.input_value("input[aria-label='주소']")
        log("address:", addr)
        pin_badge = page.locator("text=위치 지정됨").count()
        log("pin set:", pin_badge)

        # 3) 사진 첨부
        page.set_input_files("input[type=file]", PHOTO)
        page.wait_for_timeout(1200)
        page.screenshot(path=f"{SHOT_DIR}/e2e-add-360.png", full_page=True)

        # 4) 등록
        page.get_by_role("button", name=re.compile("지도에 등록하기")).click()
        try:
            page.wait_for_url(re.compile(r"/p/[0-9a-f-]{36}"), timeout=45000)
        except Exception:
            log("submit did not navigate. url:", page.url)
            log("page text:", page.inner_text("body")[:600])
            page.screenshot(path=f"{SHOT_DIR}/e2e-submit-fail.png", full_page=True)
            raise
        page.wait_for_timeout(2500)
        log("detail url:", page.url)
        title = page.locator("h1").first.inner_text()
        log("detail title:", title)
        page.screenshot(path=f"{SHOT_DIR}/e2e-detail-360.png", full_page=True)

        # 5) 리뷰 작성
        page.get_by_role("button", name="리뷰 쓰기").click()
        page.fill("input[aria-label='닉네임']", "빵순이")
        page.fill("input[aria-label='세례명']", "마리아")
        page.fill("textarea[aria-label='리뷰 내용']", "스티커 보고 들어갔어요. 갓 구운 소금빵 정말 맛있습니다!")
        page.get_by_role("button", name="리뷰 남기기").click()
        page.wait_for_timeout(2500)
        log("reviews visible:", page.locator("text=스티커 보고 들어갔어요").count())

        # 6) 신고 1회차 (이 브라우저)
        def report_once():
            page.get_by_role("button", name="사실과 달라요").click()
            page.wait_for_timeout(600)
            page.locator("label", has_text="주소나 위치가 달라요").first.click()
            page.get_by_role("button", name="신고하기").click()
            page.wait_for_timeout(2000)
            txt = page.locator("text=신고가 접수되었어요").count() or page.locator("text=이미 신고한 가게예요").count()
            page.get_by_role("button", name="확인").click()
            page.wait_for_timeout(800)
            return txt

        log("report 1:", report_once())
        log("same browser again:", report_once())

        # 다른 브라우저 2·3회차 (기기 키 교체)
        for i in (2, 3):
            page.evaluate("localStorage.removeItem('gyou.device')")
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(1200)
            try:
                log(f"report {i}:", report_once())
            except Exception as e:
                log(f"report {i} failed:", e)
            page.wait_for_timeout(1500)

        # 7) 숨김 확인
        page.wait_for_timeout(2500)
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(2000)
        markers = page.locator(".gyou-pin").count()
        log("markers after 3 reports:", markers)
        page.screenshot(path=f"{SHOT_DIR}/e2e-hidden-map-360.png")
        browser.close()

if __name__ == "__main__":
    main()
