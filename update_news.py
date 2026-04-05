#!/usr/bin/env python3
"""
update_news.py — Aktualisiert die News-Sektion in index.html
mit den 3 wichtigsten kardiologischen Studien des letzten Monats.

Verwendung:  python3 update_news.py
             python3 update_news.py --monat "März 2026"   # bestimmter Monat
             python3 update_news.py --dry-run             # nur Vorschau, kein Schreiben

Voraussetzung:
  pip install anthropic
  export ANTHROPIC_API_KEY="sk-ant-..."
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime

try:
    import anthropic
except ImportError:
    sys.exit("Fehler: 'anthropic' nicht installiert. Bitte: pip install anthropic")

# ── Konfiguration ────────────────────────────────────────────────────────────
HTML_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
MODEL     = "claude-opus-4-6"   # oder "claude-sonnet-4-6" für günstigere Variante
MAX_USES  = 8                   # max. Web-Suchanfragen

MONATE_DE = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
]

# ── Icons & Farben je Kategorie ──────────────────────────────────────────────
CATEGORY_STYLES = {
    "intervention": {
        "gradient": "linear-gradient(135deg, #fce8e8, #f5d0d0)",
        "key":  "heart",
        "icon": '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    },
    "rhythmus": {
        "gradient": "linear-gradient(135deg, #e8f2f4, #d0e8f5)",
        "key":  "ekg",
        "icon": '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    },
    "herzinsuffizienz": {
        "gradient": "linear-gradient(135deg, #ede8f4, #d8d0f5)",
        "key":  "ekg",
        "icon": '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    },
    "prävention": {
        "gradient": "linear-gradient(135deg, #f0f4e8, #d8efd0)",
        "key":  "shield",
        "icon": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    },
    "forschung": {
        "gradient": "linear-gradient(135deg, #e8f2f4, #d0e8f5)",
        "key":  "ekg",
        "icon": '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    },
    "default": {
        "gradient": "linear-gradient(135deg, #fce8e8, #f5d0d0)",
        "key":  "heart",
        "icon": '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    },
}

DELAYS = ["", " delay-2", " delay-4"]


# ── Hilfsfunktionen ──────────────────────────────────────────────────────────

def vormonat_str() -> str:
    """Gibt den Vormonat als 'Monat Jahr' zurück."""
    heute = datetime.now()
    m = heute.month - 1 or 12
    j = heute.year if heute.month > 1 else heute.year - 1
    return f"{MONATE_DE[m - 1]} {j}"


def style_fuer(tag: str) -> dict:
    """Wählt Farbschema/Icon passend zur Kategorie."""
    t = tag.lower()
    for key in CATEGORY_STYLES:
        if key in t:
            return CATEGORY_STYLES[key]
    return CATEGORY_STYLES["default"]


def html_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
    )


def render_card(studie: dict, index: int) -> str:
    """Rendert eine News-Karte als HTML mit data-* Attributen für den Modal."""
    delay    = DELAYS[index % 3]
    style    = style_fuer(studie.get("tag", ""))
    titel    = html_escape(studie.get("titel", "—"))
    datum    = html_escape(studie.get("datum", ""))
    tag      = html_escape(studie.get("tag", "Forschung"))
    excerpt  = html_escape(studie.get("zusammenfassung", ""))
    volltext = html_escape(studie.get("volltext", studie.get("zusammenfassung", "")))
    doi_url  = html_escape(studie.get("doi", "").strip())
    icon_key = style["key"]
    gradient = style["gradient"]

    return f"""\
          <!-- News Card {index + 1} -->
          <article class="news-card animate-on-scroll{delay}"
                   role="button" tabindex="0"
                   onclick="openNewsModal(this)"
                   onkeydown="if(event.key==='Enter'||event.key===' '){{event.preventDefault();openNewsModal(this);}}"
                   data-news-title="{titel}"
                   data-news-tag="{tag}"
                   data-news-date="{datum}"
                   data-news-gradient="{gradient}"
                   data-news-icon="{icon_key}"
                   data-news-doi="{doi_url}"
                   data-news-text="{volltext}">
            <div class="news-card__image" aria-hidden="true">
              <div class="news-card__image-bg" style="background: {gradient};"></div>
              <div class="news-card__image-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  {style['icon']}
                </svg>
              </div>
            </div>
            <div class="news-card__body">
              <div class="news-card__meta">
                <span class="news-card__date">{datum}</span>
                <span class="news-card__tag">{tag}</span>
              </div>
              <h3 class="news-card__title">{titel}</h3>
              <p class="news-card__excerpt">
                {excerpt}
              </p>
              <span class="news-card__link" aria-hidden="true">Details ansehen <span>→</span></span>
            </div>
          </article>"""


def patch_html(cards_html: str, dry_run: bool = False) -> None:
    """Ersetzt den Inhalt zwischen den NEWS-Markern in index.html."""
    with open(HTML_FILE, "r", encoding="utf-8") as f:
        original = f.read()

    pattern     = r"(<!-- NEWS-START -->).*?(<!-- NEWS-END -->)"
    replacement = f"<!-- NEWS-START -->\n{cards_html}\n          <!-- NEWS-END -->"
    new_html, n = re.subn(pattern, replacement, original, flags=re.DOTALL)

    if n == 0:
        sys.exit(
            "Fehler: Marker <!-- NEWS-START --> / <!-- NEWS-END --> "
            "nicht in index.html gefunden."
        )

    if dry_run:
        print("\n── Vorschau (dry-run) ──────────────────────────────────────")
        print(cards_html)
        print("────────────────────────────────────────────────────────────")
        print("Dry-run: index.html wurde NICHT verändert.")
        return

    with open(HTML_FILE, "w", encoding="utf-8") as f:
        f.write(new_html)
    print(f"✓ index.html aktualisiert.")


# ── Claude API ───────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
Du bist ein kardiologischer Wissenschaftsjournalist.
Antworte AUSSCHLIESSLICH mit validem JSON — kein Markdown, kein Text davor oder danach.
Kein ```json, kein ```. Nur reines JSON."""

def USER_PROMPT(monat_str: str) -> str:
    return f"""\
Suche die 3 klinisch wichtigsten kardiologischen Originalarbeiten aus {monat_str}.

Quellen (absteigend nach Priorität):
NEJM, The Lancet, Nature Medicine, JAMA, European Heart Journal,
Circulation, JACC, JAMA Cardiology, JACC Heart Failure,
JACC Cardiovascular Interventions, Nature Cardiovascular Research.

Regeln:
- Nur Originalarbeiten (RCTs, Kohortenstudien, Registerstudien)
- Keine Reviews, Metaanalysen, Editorials, Leitlinien, Briefe
- Bevorzuge RCTs mit direkter klinischer Relevanz
- Titel auf Deutsch (max. 90 Zeichen)

Antworte mit exakt diesem JSON:
{{
  "monat": "{monat_str}",
  "studien": [
    {{
      "titel": "Studientitel auf Deutsch (max. 90 Zeichen)",
      "datum": "{monat_str}",
      "tag": "Kategorie (Intervention | Herzinsuffizienz | Rhythmus | Prävention | Forschung)",
      "zusammenfassung": "2 Sätze: Kernaussage der Studie, patientenverständlich.",
      "volltext": "4-5 Sätze: Studiendesign, Patientengruppe, primärer Endpunkt, Hauptergebnis mit Zahlenwert (HR/OR/%, p-Wert), klinische Schlussfolgerung und Praxisrelevanz. Auf Deutsch, für Kardiologen.",
      "doi": "https://doi.org/... (leer lassen wenn nicht sicher)"
    }}
  ]
}}"""


def fetch_studies(monat_str: str) -> list[dict]:
    """Ruft Claude API auf und gibt die Liste der Studien zurück."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        sys.exit(
            "Fehler: ANTHROPIC_API_KEY nicht gesetzt.\n"
            "Bitte: export ANTHROPIC_API_KEY='sk-ant-...'"
        )

    client = anthropic.Anthropic(api_key=api_key)

    print(f"Frage Claude ({MODEL}) nach Studien für {monat_str} …")

    response = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": USER_PROMPT(monat_str)}],
        tools=[{
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": MAX_USES,
        }],
    )

    # Sammle alle Text-Blöcke (nach den Web-Such-Ergebnissen kommt das JSON)
    text_parts = [
        block.text
        for block in response.content
        if hasattr(block, "text") and block.text.strip()
    ]
    raw = "\n".join(text_parts).strip()

    # Robustes JSON-Parsing: ggf. eingebettetes JSON extrahieren
    json_match = re.search(r"\{[\s\S]*\}", raw)
    if not json_match:
        print("API-Antwort (debug):\n", raw)
        sys.exit("Fehler: Kein JSON in der API-Antwort gefunden.")

    try:
        data = json.loads(json_match.group())
    except json.JSONDecodeError as e:
        print("Ungültiges JSON:\n", json_match.group())
        sys.exit(f"JSON-Fehler: {e}")

    studien = data.get("studien", [])
    if not studien:
        sys.exit("Fehler: 'studien'-Liste ist leer.")

    return studien[:3]


# ── Einstiegspunkt ───────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Aktualisiert die Kardiologie-News in index.html via Claude API."
    )
    parser.add_argument(
        "--monat",
        default="",
        help='Zielmonat, z.B. "März 2026". Standard: Vormonat.',
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Vorschau ausgeben, index.html nicht verändern.",
    )
    args = parser.parse_args()

    monat_str = args.monat.strip() if args.monat else vormonat_str()
    print(f"Zielmonat: {monat_str}")

    studien = fetch_studies(monat_str)

    print(f"\nGefundene Studien ({len(studien)}):")
    for i, s in enumerate(studien, 1):
        print(f"  {i}. {s.get('titel', '?')}")
        if s.get("doi"):
            print(f"     DOI: {s['doi']}")

    cards_html = "\n".join(render_card(s, i) for i, s in enumerate(studien))
    patch_html(cards_html, dry_run=args.dry_run)

    if not args.dry_run:
        print("\nFertig. Bitte index.html im Browser prüfen.")


if __name__ == "__main__":
    main()
