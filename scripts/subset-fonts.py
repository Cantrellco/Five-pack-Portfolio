#!/usr/bin/env python3
"""Subset the three variable fonts down to the glyphs this site actually uses.

Run once when a font or the charset changes; the outputs are committed to
`public/fonts/` so neither Vercel nor CI needs Python to build.

    pip install fonttools brotli
    python3 scripts/subset-fonts.py

Variable axes are preserved (Newsreader keeps `opsz`, so display sizes get the
optical design rather than a scaled-up text design). Only the `latin` subset
files are used as input — `latin-ext`, `vietnamese` and `cyrillic` are dropped
wholesale, which is where most of the savings come from.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODULES = ROOT / "node_modules"
OUT = ROOT / "public" / "fonts"

# Basic Latin plus the typographic marks the copy uses. Kept deliberately wider
# than the current copy so an edit does not silently produce a tofu box.
UNICODES = ",".join(
    [
        "U+0020-007E",  # printable ASCII
        "U+00A0",  # nbsp
        "U+00A9",  # ©
        "U+00B0",  # °
        "U+00B7",  # ·
        "U+00D7",  # ×
        "U+2010-2015",  # hyphen, en/em dashes
        "U+2018-201D",  # curly quotes
        "U+2022",  # •
        "U+2026",  # …
        "U+2032-2033",  # prime, double prime
        "U+2190-2193",  # arrows
        "U+2212",  # minus
    ]
)

# (npm package, source file, output file, axis limits, note)
#
# `limits` narrows a variable axis to the range the site actually uses before
# subsetting. Trimming unused weights strips their deltas out of gvar, which is
# where most of a variable font's bytes live. `opsz` is never limited on the
# display face — that axis is the reason it was chosen.
FONTS = [
    (
        "@fontsource-variable/newsreader",
        "newsreader-latin-opsz-normal.woff2",
        "newsreader-display.woff2",
        ["wght=400:600"],
        "display — opsz 6..72 kept, wght trimmed to 400..600",
    ),
    (
        "@fontsource-variable/instrument-sans",
        "instrument-sans-latin-wght-normal.woff2",
        "instrument-sans.woff2",
        ["wght=400:700"],
        "body — wght 400..700",
    ),
    (
        "@fontsource-variable/instrument-sans",
        "instrument-sans-latin-wght-italic.woff2",
        "instrument-sans-italic.woff2",
        ["wght=400:600"],
        "body italic — wght 400..600",
    ),
    (
        "@fontsource-variable/martian-mono",
        "martian-mono-latin-wght-normal.woff2",
        "martian-mono.woff2",
        ["wght=400:600"],
        "utility/mono — wght 400..600",
    ),
]


def main() -> int:
    try:
        import fontTools  # noqa: F401
        import brotli  # noqa: F401
    except ImportError:
        print("Missing deps. Run: pip install fonttools brotli", file=sys.stderr)
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    total_before = total_after = 0

    tmp = OUT / ".instanced.ttf"

    for package, src_name, out_name, limits, note in FONTS:
        src = MODULES / package / "files" / src_name
        if not src.exists():
            print(f"! missing {src} — run npm install first", file=sys.stderr)
            return 1
        dst = OUT / out_name

        subprocess.run(
            [sys.executable, "-m", "fontTools.varLib.instancer", str(src), *limits, f"--output={tmp}"],
            check=True,
            capture_output=True,
        )

        subprocess.run(
            [
                sys.executable,
                "-m",
                "fontTools.subset",
                str(tmp),
                f"--unicodes={UNICODES}",
                "--layout-features=kern,liga,calt,tnum,frac,ccmp,locl,mark,mkmk",
                "--flavor=woff2",
                "--no-hinting",
                "--desubroutinize",
                f"--output-file={dst}",
            ],
            check=True,
            capture_output=True,
        )

        before, after = src.stat().st_size, dst.stat().st_size
        total_before += before
        total_after += after
        pct = 100 - (after / before * 100)
        print(f"{out_name:<28} {before/1024:6.1f}KB -> {after/1024:5.1f}KB  (-{pct:.0f}%)  {note}")

    # The Open Graph card is rendered with Satori, which reads ttf/otf/woff but
    # NOT woff2 — so the display face also ships as a tiny pinned TTF holding
    # only the characters that appear on the card.
    og_src = MODULES / "@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2"
    og_out = ROOT / "app" / "og-display.ttf"
    subprocess.run(
        [sys.executable, "-m", "fontTools.varLib.instancer", str(og_src), "wght=500", "opsz=60", f"--output={tmp}"],
        check=True,
        capture_output=True,
    )
    subprocess.run(
        [
            sys.executable,
            "-m",
            "fontTools.subset",
            str(tmp),
            "--unicodes=U+0020-007E,U+2014,U+2019",
            "--layout-features=kern,liga",
            "--no-hinting",
            f"--output-file={og_out}",
        ],
        check=True,
        capture_output=True,
    )
    print(f"{'og-display.ttf':<28} {'':>6}    {og_out.stat().st_size/1024:5.1f}KB          social card (pinned instance)")

    tmp.unlink(missing_ok=True)
    print(f"\ntotal {total_before/1024:.1f}KB -> {total_after/1024:.1f}KB (web fonts)")

    # Ship the licences next to the fonts. Both families are OFL-1.1.
    for package, name in (
        ("@fontsource-variable/newsreader", "Newsreader"),
        ("@fontsource-variable/instrument-sans", "Instrument-Sans"),
        ("@fontsource-variable/martian-mono", "Martian-Mono"),
    ):
        for candidate in ("LICENSE", "LICENSE.md", "LICENSE.txt"):
            lic = MODULES / package / candidate
            if lic.exists():
                shutil.copy(lic, OUT / f"{name}-OFL.txt")
                break

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
