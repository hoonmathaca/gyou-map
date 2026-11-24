"""최종 360px 스크린샷용 — 가게 1곳 + 리뷰 1개 등록 후 카드 열린 지도 화면을 찍고 정리한다."""
import re
import time
import json
import urllib.request
from playwright.sync_api import sync_playwright

BASE = "https://gyou-map.vercel.app"
PHOTO = "/workspace/downloads/gyou-sticker-sample.jpg"


def api(path, body=None, token=None):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body else None,
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
        method="POST" if body else "GET",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 360, "height": 812}, device_scale_factor=2,
                        locale="ko-KR", timezone_id="Asia/Seoul")
    page = ctx.new_page()
    page.goto(f"{BASE}/add", wait_until="networkidle")
    page.fill("#name", "하늘빵집")
    page.fill("#baptismal", "요한")
    page.fill("#intro", "매일 아침 직접 굽는 빵, 교우 10% 할인")

    with ctx.expect_page() as info:
        page.get_by_role("button", name="주소 찾기").click()
    pop = info.value
    fr = None
    for _ in range(40):
        for f in pop.frames:
            try:
                if f.query_selector("input"):
                    fr = f
                    break
            except Exception:
                pass
        if fr:
            break
        time.sleep(0.5)
    inp = fr.query_selector("input")
    inp.fill("동백죽전대로 315")
    inp.press("Enter")
    time.sleep(2)
    fr.locator("button.link_post").first.click()
    time.sleep(2.5)

    page.set_input_files("input[type=file]", PHOTO)
    page.wait_for_timeout(1000)
    page.get_by_role("button", name=re.compile("지도에 등록하기")).click()
    page.wait_for_url(re.compile(r"/p/[0-9a-f-]{36}"), timeout=60000)
    page.wait_for_timeout(2000)
    place_url = page.url
    place_id = place_url.split("/p/")[1].split("?")[0]
    print("registered", place_id, flush=True)

    # 리뷰 1개
    page.get_by_role("button", name="리뷰 쓰기").click()
    page.fill("input[aria-label='닉네임']", "빵순이")
    page.fill("input[aria-label='세례명']", "마리아")
    page.fill("textarea[aria-label='리뷰 내용']", "스티커 보고 들어갔어요. 갓 구운 소금빵 정말 맛있습니다!")
    page.get_by_role("button", name="리뷰 남기기").click()
    page.wait_for_timeout(2500)
    page.screenshot(path="/workspace/browser/final-detail-360.png", full_page=True)

    # 지도에서 카드 열기
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_timeout(3500)
    page.locator(".gyou-pin").first.click()
    page.wait_for_timeout(1500)
    print("fab visible:", page.locator("text=가게 등록").count(), flush=True)
    page.screenshot(path="/workspace/downloads/gyou-map-360.png")
    page.screenshot(path="/workspace/browser/final-map-360-full.png", full_page=True)
    b.close()

# 정리 — 관리자 API로 삭제
token = api("/api/admin", {"password": "0801"})["token"]
data = api("/api/admin", token=token)
print("before delete:", len(data["places"]), "places,", len(data["reviews"]), "reviews", flush=True)
for place in data["places"]:
    api("/api/admin", {"token": token, "action": "place.delete", "id": place["id"]})
data = api("/api/admin", token=token)
print("after delete:", len(data["places"]), "places,", len(data["reviews"]), "reviews,", len(data["reports"]), "reports")
