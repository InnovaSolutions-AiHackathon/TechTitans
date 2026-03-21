from types import SimpleNamespace

import backend.main as main
from backend.main import _citation_token, _clean_symbol, _extract_json_block


def test_citation_token_page():
    tok = _citation_token("10K", 42, "MD&A")
    assert tok == ":10K:p.42"


def test_clean_symbol():
    assert _clean_symbol(" nvda ") == "NVDA"
    assert _clean_symbol("brk.b") == "BRK.B"


def test_extract_json_block():
    raw = "```json\n[{\"ticker\":\"NVDA\"}]\n```"
    assert _extract_json_block(raw) == '[{"ticker":"NVDA"}]'


def test_html_to_text_basic():
    raw = "<html><head><style>.x{}</style></head><body><h1>Title</h1><p>Hello&nbsp;World &amp; Co.</p><script>ignored()</script></body></html>"
    out = main._html_to_text(raw)
    # Tags and script/style should be stripped, entities normalised, whitespace collapsed.
    assert "Title" in out
    assert "Hello World & Co." in out
    assert "<" not in out and "script" not in out


def test_normalize_sec_doc_url_ix_to_archive():
    ix_url = "https://www.sec.gov/ix?doc=/Archives/edgar/data/0000320193/000114036126006577/ef20060722_8k.htm"
    norm = main._normalize_sec_doc_url(ix_url)
    assert norm.startswith("https://www.sec.gov/Archives/edgar/data/0000320193/")
    assert norm.endswith("ef20060722_8k.htm")


def test_extract_sec_document_success(monkeypatch):
    # Fake HTML page with minimal structure.
    sample_html = """
    <html><body>
    <h1>FORM 8-K</h1>
    <p>Date of Report: February 24, 2026</p>
    <p>Apple Inc.</p>
    </body></html>
    """

    class DummyResp:
        def __init__(self, data: str):
            self._data = data.encode("utf-8")

        def read(self):
            return self._data

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    # Patch urlopen used inside extract_sec_document.
    monkeypatch.setattr(
        main,
        "urlopen",
        lambda req, timeout=40: DummyResp(sample_html),
    )

    # Disable Claude for this test so we exercise the regex-based extractor.
    monkeypatch.setattr(main, "CLAUDE_API_KEY", "")

    out = main.extract_sec_document(
        "https://www.sec.gov/ix?doc=/Archives/edgar/data/0000320193/000114036126006577/ef20060722_8k.htm"
    )
    assert out["document_url"].endswith("ef20060722_8k.htm")
    assert "text" in out and "FORM 8-K" in out["text"]
    # Key points should include filing type and company.
    joined_points = " ".join(out.get("key_points") or [])
    assert "Form 8-K" in joined_points
    assert "Apple Inc." in joined_points
