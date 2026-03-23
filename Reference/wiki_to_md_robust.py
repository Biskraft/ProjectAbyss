"""Robust wiki XML dump -> Markdown converter. Handles malformed XML."""

import os
import re
import html
import sys

OUTPUT_DIR = "castlevania-wiki-md"
ALLOWED_NS = {"0", "14"}


def sanitize_filename(title: str) -> str:
    name = title.replace("/", "_").replace("\\", "_").replace(":", " -")
    name = re.sub(r'[<>"|?*]', "", name)
    name = name.strip(". ")
    if len(name) > 200:
        name = name[:200]
    return name


def wikitext_to_markdown(text: str) -> str:
    if not text:
        return ""
    t = text
    t = html.unescape(t)
    t = re.sub(r"</?noinclude>", "", t)
    t = re.sub(r"</?includeonly>", "", t)
    t = re.sub(r"</?onlyinclude>", "", t)
    t = re.sub(r"<!--.*?-->", "", t, flags=re.DOTALL)
    t = re.sub(r"<ref[^>]*>.*?</ref>", "", t, flags=re.DOTALL)
    t = re.sub(r"<ref[^/]*/?>", "", t)
    t = re.sub(r"<gallery[^>]*>.*?</gallery>", "", t, flags=re.DOTALL)
    t = re.sub(r"<tabber>.*?</tabber>", "", t, flags=re.DOTALL)
    t = re.sub(r"<tabview>.*?</tabview>", "", t, flags=re.DOTALL)
    t = re.sub(r"\{\{[^{}]{500,}\}\}", "", t, flags=re.DOTALL)
    t = re.sub(r"={5}\s*(.+?)\s*={5}", r"##### \1", t)
    t = re.sub(r"={4}\s*(.+?)\s*={4}", r"#### \1", t)
    t = re.sub(r"={3}\s*(.+?)\s*={3}", r"### \1", t)
    t = re.sub(r"={2}\s*(.+?)\s*={2}", r"## \1", t)
    t = re.sub(r"'{5}(.+?)'{5}", r"***\1***", t)
    t = re.sub(r"'{3}(.+?)'{3}", r"**\1**", t)
    t = re.sub(r"'{2}(.+?)'{2}", r"*\1*", t)
    t = re.sub(r"\[\[(?:[Cc]ategory|Category):([^\]|]+?)(?:\|[^\]]*?)?\]\]", r"Category: \1", t)
    t = re.sub(r"\[\[(?:[^|\]]*?\|)?([^\]]+?)\]\]", r"\1", t)
    t = re.sub(r"\[(https?://\S+)\s+([^\]]+)\]", r"[\2](\1)", t)
    t = re.sub(r"\[(https?://\S+)\]", r"<\1>", t)

    lines = t.split("\n")
    result = []
    for line in lines:
        s = line.lstrip()
        if s.startswith("****"):
            line = "      - " + s[4:].strip()
        elif s.startswith("***"):
            line = "    - " + s[3:].strip()
        elif s.startswith("**"):
            line = "  - " + s[2:].strip()
        elif s.startswith("*"):
            line = "- " + s[1:].strip()
        elif s.startswith("{|"):
            line = ""
        elif s.startswith("|}"):
            line = ""
        elif s.startswith("|-"):
            line = "---"
        elif s.startswith("!"):
            cells = re.split(r"\s*!!\s*", s[1:])
            line = "| " + " | ".join(c.strip() for c in cells) + " |"
        elif s.startswith("|") and not s.startswith("|}"):
            cells = re.split(r"\s*\|\|\s*", s[1:])
            line = "| " + " | ".join(c.strip() for c in cells) + " |"
        result.append(line)

    t = "\n".join(result)
    t = re.sub(r"\{\{[Mm]ain\|(.+?)\}\}", r"*Main article: \1*", t)
    t = re.sub(r"\{\{[Ss]tub\}\}", r"*(This article is a stub)*", t)
    t = re.sub(r"\{\{[Qq]uote\|([^}]+)\}\}", r'> \1', t)
    t = re.sub(r"\{\{[^}]{0,200}\}\}", "", t)
    t = re.sub(r"\n{4,}", "\n\n\n", t)
    t = re.sub(r"__[A-Z]+__", "", t)
    return t.strip()


def parse_pages_regex(xml_path):
    """Parse wiki XML using regex - handles malformed XML."""
    print(f"Reading {xml_path}...")

    # Read in chunks to handle large files
    pages = {}
    page_pattern = re.compile(
        r'<page[^>]*>\s*'
        r'<title>(.+?)</title>\s*'
        r'<ns>(\d+)</ns>\s*'
        r'<id>\d+</id>\s*'
        r'(.*?)'
        r'</page>',
        re.DOTALL
    )

    rev_pattern = re.compile(
        r'<revision>.*?'
        r'<timestamp>(.+?)</timestamp>.*?'
        r'<text[^>]*>(.*?)</text>.*?'
        r'</revision>',
        re.DOTALL
    )

    # Read file in manageable chunks with overlap
    chunk_size = 50 * 1024 * 1024  # 50MB
    overlap = 500 * 1024  # 500KB overlap for split pages

    with open(xml_path, 'r', encoding='utf-8', errors='replace') as f:
        buffer = ""
        total_read = 0
        file_size = os.path.getsize(xml_path)

        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                # Process remaining buffer
                buffer += chunk if chunk else ""
                for m in page_pattern.finditer(buffer):
                    title = m.group(1)
                    ns = m.group(2)
                    if ns not in ALLOWED_NS:
                        continue
                    revisions = m.group(3)
                    best_ts = ""
                    best_text = ""
                    for rm in rev_pattern.finditer(revisions):
                        ts = rm.group(1)
                        text = rm.group(2)
                        if ts > best_ts:
                            best_ts = ts
                            best_text = text
                    if best_text:
                        existing = pages.get(title)
                        if not existing or best_ts > existing[1]:
                            pages[title] = (best_text, best_ts)
                break

            buffer += chunk
            total_read += len(chunk)
            pct = min(100, int(total_read / file_size * 100))

            # Find complete pages in buffer
            last_page_end = 0
            for m in page_pattern.finditer(buffer):
                title = m.group(1)
                ns = m.group(2)
                last_page_end = m.end()

                if ns not in ALLOWED_NS:
                    continue

                revisions = m.group(3)
                best_ts = ""
                best_text = ""
                for rm in rev_pattern.finditer(revisions):
                    ts = rm.group(1)
                    text = rm.group(2)
                    if ts > best_ts:
                        best_ts = ts
                        best_text = text

                if best_text:
                    existing = pages.get(title)
                    if not existing or best_ts > existing[1]:
                        pages[title] = (best_text, best_ts)

            # Keep only unprocessed part (from last complete page end)
            if last_page_end > 0:
                buffer = buffer[last_page_end:]
            elif len(buffer) > overlap * 2:
                # No complete page found but buffer is huge - keep tail
                buffer = buffer[-overlap:]

            print(f"  {pct}% read, {len(pages)} pages found...", end='\r')

    print(f"\nTotal content pages found: {len(pages)}")
    return pages


def main():
    xml_path = sys.argv[1] if len(sys.argv) > 1 else "castlevania-ia-dump/castlevaniafandomcom-20200223-history.xml"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else OUTPUT_DIR

    script_dir = os.path.dirname(os.path.abspath(__file__))
    xml_path = os.path.join(script_dir, xml_path)
    output_dir = os.path.join(script_dir, output_dir)
    os.makedirs(output_dir, exist_ok=True)

    pages = parse_pages_regex(xml_path)

    print("Converting to Markdown...")
    count = 0
    skipped = 0

    for title, (text, ts) in sorted(pages.items()):
        # Unescape XML entities in text
        text = text.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").replace("&quot;", '"')

        if not text or len(text.strip()) < 10:
            skipped += 1
            continue
        if text.strip().upper().startswith("#REDIRECT"):
            skipped += 1
            continue

        md_content = wikitext_to_markdown(text)
        if len(md_content.strip()) < 10:
            skipped += 1
            continue

        filename = sanitize_filename(title) + ".md"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# {title}\n\n{md_content}\n")
        count += 1

    print(f"Done! {count} markdown files created, {skipped} skipped.")
    print(f"Output: {output_dir}")


if __name__ == "__main__":
    main()
