"""Remove decorative emoji and sparkle icons from app source."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP = {"node_modules", "dist", ".git", "venv", ".venv", "__pycache__"}
EXTS = {".tsx", ".ts", ".py", ".jsx", ".js", ".html"}

EMOJI = re.compile(
    "["
    "\U0001F1E6-\U0001F1FF"
    "\U0001F300-\U0001FAFF"
    "\U00002600-\U000027BF"
    "\U0001F000-\U0001F0FF"
    "\uFE0F"
    "\u200D"
    "]+"
)

EMPTY_SIZED = re.compile(
    r"[ \t]*<(span|div)([^>]*\btext-(?:lg|xl|2xl|3xl|4xl)\b[^>]*)>\s*</\1>[ \t]*\n?",
    re.MULTILINE,
)


def strip_emoji(text: str) -> str:
    text = EMOJI.sub("", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"([\"'`]) +", r"\1", text)
    text = re.sub(r" +([\"'`])", r"\1", text)
    return text


def strip_sparkles(text: str) -> str:
    text = re.sub(
        r"(\?\s*<RefreshCw\b[^>]*/>)\s*:\s*<Sparkles\b[^>]*/>",
        r"\1 : null",
        text,
    )
    text = re.sub(r"[ \t]*<Sparkles\b[^>]*/>[ \t]*", "", text)

    def clean_import(match: re.Match) -> str:
        body = match.group(1)
        names = [part.strip() for part in body.split(",") if part.strip() and part.strip() != "Sparkles"]
        if not names:
            return ""
        if "\n" in body:
            inner = "\n  " + ",\n  ".join(names) + ",\n"
        else:
            inner = " " + ", ".join(names) + " "
        return f"import {{{inner}}} from {match.group(2)}"

    text = re.sub(
        r"import\s*\{([^}]*)\}\s*from\s*(['\"]lucide-react['\"];?)",
        clean_import,
        text,
    )
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def main() -> None:
    changed = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix not in EXTS:
            continue
        if any(part in SKIP for part in path.parts):
            continue
        original = path.read_text(encoding="utf-8")
        updated = strip_emoji(original)
        updated = strip_sparkles(updated)
        updated = EMPTY_SIZED.sub("", updated)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed.append(str(path.relative_to(ROOT)))
    print(f"updated {len(changed)} files")
    for name in changed:
        print(name)


if __name__ == "__main__":
    main()
