import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":500,"height":700}, locale="ko-KR")
    page = ctx.new_page()
    page.goto("https://gyou-map.vercel.app/add", wait_until="networkidle")
    with ctx.expect_page() as info:
        page.get_by_role("button", name="주소 찾기").click()
    pop = info.value
    for i in range(40):
        fs = pop.frames
        print(i, len(fs), [f.url[:60] for f in fs])
        got = None
        for f in fs:
            try:
                if f.query_selector("input"):
                    got = f
                    break
            except Exception as e:
                pass
        if got:
            break
        time.sleep(0.5)
    print("frame:", got.url if got else None)
    if not got:
        b.close(); raise SystemExit(1)
    inp = got.query_selector("input")
    inp.fill("동백죽전대로 315")
    inp.press("Enter")
    time.sleep(2.5)
    items = got.query_selector_all("a")
    print("anchors:", len(items))
    for a in items[:8]:
        print("A:", a.get_attribute("class"), "|", (a.inner_text() or "").replace("\n"," / ")[:80])
    print("LI:", [ (li.get_attribute("class") or "") for li in got.query_selector_all("li")][:8])
    html = got.inner_html("body")
    j = html.find("아래에서 주소 선택")
    print(html[j:j+1500] if j>0 else html[-1500:])
    b.close()
