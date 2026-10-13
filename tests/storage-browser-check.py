"""Targeted real-Chromium storage regression; API faults are scoped to one tab.

Run against the already-running game-work server. Real UI imports the backup and
changes progress; init scripts only seed a corrupt fixture or inject a named
browser capability/storage failure. No game state is assigned by the tests.
"""
import json
import pathlib
import sys
import traceback

from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / ".qa" / "storage"
OUT.mkdir(parents=True, exist_ok=True)
URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4318/game-work/src/"
KEY = "mosslight-post-v1"
BACKUP = ROOT / ".qa" / "browser" / "first-save.json"
CORRUPT = "{incomplete-local-save"
REPORT = {"url": URL, "engine": "headless Chromium", "checks": [], "errors": [], "scenarios": {}}


def check(condition, name):
    if not condition:
        raise AssertionError(name)
    REPORT["checks"].append(name)


def snapshot(page):
    return json.loads(page.evaluate("window.render_game_to_text()"))


def raw(page):
    return page.evaluate("key => localStorage.getItem(key)", KEY)


def action(page, name, item=None):
    selector = f'[data-action="{name}"]'
    if item is not None:
        selector += f'[data-id="{item}"]'
    page.locator(selector).click()
    page.wait_for_timeout(80)


def new_page(context, label, init=None):
    page = context.new_page()
    page.on("pageerror", lambda error: REPORT["errors"].append(f"{label}: {error}"))
    if init:
        page.add_init_script(init)
    page.goto(URL, wait_until="networkidle")
    page.wait_for_function("typeof window.render_game_to_text === 'function' && document.querySelector('#scene-targets')")
    page.wait_for_timeout(100)
    # Reconnaissance: inspect rendered controls before selecting UI actions.
    REPORT.setdefault("initial_controls", {})[label] = page.locator("button:visible").all_text_contents()
    return page


def import_backup(page):
    if not page.locator("#modal").evaluate("element => element.open"):
        page.locator("#settings-open").click()
    page.locator("#import-file").set_input_files(str(BACKUP))
    page.locator('[data-action="confirm-import"]').wait_for(state="visible")
    action(page, "confirm-import")
    page.wait_for_function("!document.querySelector('#modal').open")
    check(snapshot(page)["progress"]["lettersDone"] == 1, "UI import restores one-letter fixture")


def place_bench(page):
    page.locator('[data-tab="decor"]').click()
    action(page, "decor", "bench")
    action(page, "world-plot", "porch-left")
    page.wait_for_function("JSON.parse(window.render_game_to_text()).plots[4] === 'bench'")


def settings_change(page, name):
    if not page.locator("#modal").evaluate("element => element.open"):
        page.locator("#settings-open").click()
    revision = snapshot(page)["revision"]
    action(page, "setting", name)
    page.wait_for_function("r => JSON.parse(window.render_game_to_text()).revision > r", arg=revision)


def export_backup(page, filename):
    if not page.locator("#modal").evaluate("element => element.open"):
        page.locator("#settings-open").click()
    with page.expect_download() as download:
        action(page, "export")
    output = OUT / filename
    download.value.save_as(str(output))
    return json.loads(output.read_text(encoding="utf-8"))


def context_for(browser):
    return browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)


NO_LOCKS = "Object.defineProperty(navigator, 'locks', {configurable: true, get: () => undefined});"
SEED_CORRUPT = f"localStorage.setItem({json.dumps(KEY)}, {json.dumps(CORRUPT)});"


def verify_recovery(browser):
    context = context_for(browser)
    try:
        stale = new_page(context, "recovery-stale", SEED_CORRUPT)
        stale.locator('[data-action="reset-corrupt"]').wait_for(state="visible")
        check(raw(stale) == CORRUPT, "corrupt original remains intact before recovery")
        importer = new_page(context, "recovery-importer")
        import_backup(importer)
        stale.wait_for_function("JSON.parse(window.render_game_to_text()).progress.lettersDone === 1 && !document.querySelector('#modal').open")
        check(snapshot(stale)["storage"] == "local" and snapshot(importer)["storage"] == "local", "recovery event and importer both retain persistent mode")
        check(snapshot(stale)["revision"] == snapshot(importer)["revision"] and raw(stale) == raw(importer), "recovery page accepts actual storage event and same committed save")
        stale.screenshot(path=str(OUT / "recovery-synchronized.png"), full_page=True)
        REPORT["scenarios"]["recovery_event"] = {"storage": snapshot(stale)["storage"], "revision": snapshot(stale)["revision"], "modal_open": stale.locator("#modal").evaluate("e => e.open")}
    finally:
        context.close()


def verify_stale_reset(browser):
    context = context_for(browser)
    try:
        # Suppress only A's event delivery to model a reset clicked before its
        # queued storage event is handled. Shared storage and Web Locks are real.
        init = SEED_CORRUPT + "window.addEventListener('storage', event => event.stopImmediatePropagation(), true);"
        stale = new_page(context, "delayed-event-reset", init)
        stale.locator('[data-action="reset-corrupt"]').wait_for(state="visible")
        importer = new_page(context, "delayed-event-importer")
        import_backup(importer)
        committed = raw(importer)
        check(stale.locator('[data-action="reset-corrupt"]').is_visible() and snapshot(stale)["progress"]["lettersDone"] == 0, "delayed-event tab still holds its original recovery view")
        action(stale, "reset-corrupt")
        check(raw(stale) == committed, "stale reset compares raw under Web Lock and preserves newer valid save")
        check(snapshot(stale)["progress"]["lettersDone"] == 1 and not stale.locator("#modal").evaluate("e => e.open"), "cancelled stale reset adopts newly saved progress")
        check("重新开始已取消" in stale.locator("#toast").inner_text(), "stale reset explains cancellation")
        stale.screenshot(path=str(OUT / "stale-reset-cancelled.png"), full_page=True)
        REPORT["scenarios"]["stale_reset"] = {"fault": "A storage-event listener stopped before app listener", "toast": stale.locator("#toast").inner_text(), "save_preserved": raw(stale) == committed}
    finally:
        context.close()


def verify_no_locks(browser):
    context = context_for(browser)
    try:
        writer = new_page(context, "no-locks-writer")
        import_backup(writer)
        committed = raw(writer)
        memory = new_page(context, "no-locks-memory", NO_LOCKS)
        check(memory.evaluate("navigator.locks === undefined") and snapshot(memory)["storage"] == "memory", "missing Web Locks enters explicit memory mode")
        check(snapshot(memory)["progress"]["lettersDone"] == 1, "no-locks mode reads existing normal save")
        check("不支持安全保存" in memory.locator("#save-warning").inner_text(), "no-locks warning explains browser capability and export")
        place_bench(memory)
        local_revision = snapshot(memory)["revision"]
        check(raw(writer) == committed, "no-locks local changes never write shared save key")
        exported = export_backup(memory, "no-locks-local.json")
        check(exported["plots"][4] == "bench" and exported["revision"] == local_revision, "no-locks local progress remains exportable")
        memory.locator("#modal-close").click()
        settings_change(writer, "sound")
        settings_change(writer, "motion")
        memory.wait_for_timeout(150)
        check(snapshot(writer)["revision"] > local_revision, "normal writer advances beyond unsaved memory revision")
        check(snapshot(memory)["plots"][4] == "bench" and snapshot(memory)["revision"] == local_revision, "no-locks memory branch survives remote updates")
        check("请先导出备份" in memory.locator("#toast").inner_text(), "no-locks remote update asks to export local branch")
        memory.screenshot(path=str(OUT / "no-locks-memory-retained.png"), full_page=True)
        REPORT["scenarios"]["no_locks"] = {"fault": "navigator.locks getter returns undefined in A only", "local_revision": local_revision, "remote_revision": snapshot(writer)["revision"], "local_plot": snapshot(memory)["plots"][4], "shared_plot": json.loads(raw(writer))["plots"][4]}
    finally:
        context.close()

    context = context_for(browser)
    try:
        page = new_page(context, "no-locks-corrupt", SEED_CORRUPT + NO_LOCKS)
        page.locator('[data-action="reset-corrupt"]').wait_for(state="visible")
        action(page, "reset-corrupt")
        check(raw(page) == CORRUPT and page.locator('[data-action="reset-corrupt"]').is_visible(), "no-locks corrupt reset never deletes original data")
        check("不会删除原数据" in page.locator("#toast").inner_text(), "no-locks corrupt reset states its preservation guarantee")
    finally:
        context.close()


def verify_failed_write(browser):
    context = context_for(browser)
    try:
        writer = new_page(context, "quota-writer")
        import_backup(writer)
        committed = raw(writer)
        init = f"""
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {{
            if (key === {json.dumps(KEY)}) throw new DOMException('Injected quota failure', 'QuotaExceededError');
            return originalSetItem.call(this, key, value);
        }};
        """
        memory = new_page(context, "quota-memory", init)
        check(snapshot(memory)["storage"] == "local", "write-failure tab can initially read normal save")
        place_bench(memory)
        local_revision = snapshot(memory)["revision"]
        check(snapshot(memory)["storage"] == "memory" and raw(writer) == committed, "failed setItem retains local branch and leaves prior persisted save untouched")
        check("请先在设置里导出备份" in memory.locator("#save-warning").inner_text(), "write-failure warning makes memory-only progress explicit")
        settings_change(writer, "sound")
        settings_change(writer, "motion")
        memory.wait_for_timeout(150)
        check(snapshot(writer)["revision"] > local_revision, "other tab successfully writes newer revision after A quota fault")
        check(snapshot(memory)["plots"][4] == "bench" and snapshot(memory)["revision"] == local_revision and snapshot(memory)["storage"] == "memory", "quota-failure local progress survives equal and higher revision storage events")
        check("本页未保存的进度已保留，请先导出备份" in memory.locator("#toast").inner_text(), "quota-failure remote event asks to export instead of overwriting")
        exported = export_backup(memory, "failed-write-local.json")
        check(exported["plots"][4] == "bench" and exported["revision"] == local_revision, "failed-write local branch downloads intact")
        writer.locator("#modal-close").click()
        final_raw = raw(writer)
        writer.reload(wait_until="networkidle")
        writer.wait_for_function("typeof window.render_game_to_text === 'function'")
        check(raw(writer) == final_raw and snapshot(writer)["storage"] == "local", "normal tab remains persistently saved after independent fault")
        memory.screenshot(path=str(OUT / "quota-memory-exported.png"), full_page=True)
        REPORT["scenarios"]["quota_failure"] = {"fault": "A Storage.setItem throws for game key only", "local_revision": local_revision, "remote_revision": snapshot(writer)["revision"], "local_plot": exported["plots"][4], "shared_plot": json.loads(final_raw)["plots"][4]}
    finally:
        context.close()


def main():
    check(BACKUP.is_file(), "real prior UI backup fixture exists")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            REPORT["browser_version"] = browser.version
            verify_recovery(browser)
            verify_stale_reset(browser)
            verify_no_locks(browser)
            verify_failed_write(browser)
            check(not REPORT["errors"], "all targeted scenarios have zero uncaught browser errors")
        finally:
            browser.close()


if __name__ == "__main__":
    try:
        main()
        REPORT["result"] = "passed"
    except Exception as error:
        REPORT["result"] = "failed"
        REPORT["failure"] = str(error)
        REPORT["traceback"] = traceback.format_exc()
        raise
    finally:
        (OUT / "report.json").write_text(json.dumps(REPORT, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"result": REPORT.get("result"), "checks": len(REPORT["checks"]), "page_errors": len(REPORT["errors"]), "report": str(OUT / "report.json"), "failure": REPORT.get("failure")}, ensure_ascii=False))
