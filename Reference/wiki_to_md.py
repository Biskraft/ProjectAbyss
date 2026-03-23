"""Disgaea Wiki XML dump -> individual Markdown files converter."""

import xml.etree.ElementTree as ET
import os
import re
import html

XML_PATH = "disgaea.fandom.com-20260323-wikidump/disgaea.fandom.com-20260323-history.xml"
OUTPUT_DIR = "disgaea-wiki-md"
NS = "{http://www.mediawiki.org/xml/export-0.11/}"

# Only extract main content namespace (0) and Category (14)
ALLOWED_NS = {"0", "14"}


def sanitize_filename(title: str) -> str:
    """Convert wiki title to safe filename."""
    name = title.replace("/", "_").replace("\\", "_").replace(":", " -")
    name = re.sub(r'[<>"|?*]', "", name)
    name = name.strip(". ")
    if len(name) > 200:
        name = name[:200]
    return name


def wikitext_to_markdown(text: str) -> str:
    """Convert MediaWiki wikitext to approximate Markdown."""
    if not text:
        return ""

    t = text

    # Unescape HTML entities
    t = html.unescape(t)

    # Remove noinclude/includeonly/onlyinclude tags
    t = re.sub(r"</?noinclude>", "", t)
    t = re.sub(r"</?includeonly>", "", t)
    t = re.sub(r"</?onlyinclude>", "", t)

    # HTML comments
    t = re.sub(r"<!--.*?-->", "", t, flags=re.DOTALL)

    # ref tags -> footnote style
    t = re.sub(r"<ref[^>]*>.*?</ref>", "", t, flags=re.DOTALL)
    t = re.sub(r"<ref[^/]*/?>", "", t)

    # gallery tags
    t = re.sub(r"<gallery[^>]*>.*?</gallery>", "", t, flags=re.DOTALL)

    # tabber/tabview
    t = re.sub(r"<tabber>.*?</tabber>", "", t, flags=re.DOTALL)
    t = re.sub(r"<tabview>.*?</tabview>", "", t, flags=re.DOTALL)

    # infobox / navbox templates (rough removal of large templates)
    # Keep simple templates but remove multi-line ones
    t = re.sub(r"\{\{[^{}]{500,}\}\}", "", t, flags=re.DOTALL)

    # Headings: ====H4==== -> #### H4
    t = re.sub(r"={5}\s*(.+?)\s*={5}", r"##### \1", t)
    t = re.sub(r"={4}\s*(.+?)\s*={4}", r"#### \1", t)
    t = re.sub(r"={3}\s*(.+?)\s*={3}", r"### \1", t)
    t = re.sub(r"={2}\s*(.+?)\s*={2}", r"## \1", t)

    # Bold+Italic: '''''text''''' -> ***text***
    t = re.sub(r"'{5}(.+?)'{5}", r"***\1***", t)
    # Bold: '''text''' -> **text**
    t = re.sub(r"'{3}(.+?)'{3}", r"**\1**", t)
    # Italic: ''text'' -> *text*
    t = re.sub(r"'{2}(.+?)'{2}", r"*\1*", t)

    # Internal links: [[Page|Display]] -> Display, [[Page]] -> Page
    t = re.sub(r"\[\[(?:[Cc]ategory|Category):([^\]|]+?)(?:\|[^\]]*?)?\]\]", r"Category: \1", t)
    t = re.sub(r"\[\[(?:[^|\]]*?\|)?([^\]]+?)\]\]", r"\1", t)

    # External links: [http://url text] -> [text](url)
    t = re.sub(r"\[(https?://\S+)\s+([^\]]+)\]", r"[\2](\1)", t)
    t = re.sub(r"\[(https?://\S+)\]", r"<\1>", t)

    # Lists: * -> -, # -> 1.
    lines = t.split("\n")
    result = []
    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith("****"):
            line = "      - " + stripped[4:].strip()
        elif stripped.startswith("***"):
            line = "    - " + stripped[3:].strip()
        elif stripped.startswith("**"):
            line = "  - " + stripped[2:].strip()
        elif stripped.startswith("*"):
            line = "- " + stripped[1:].strip()
        elif stripped.startswith("####"):
            line = "      1. " + stripped[4:].strip()
        elif stripped.startswith("###"):
            line = "    1. " + stripped[3:].strip()
        elif stripped.startswith("##"):
            line = "  1. " + stripped[2:].strip()
        elif stripped.startswith("#") and not stripped.startswith("# "):
            line = "1. " + stripped[1:].strip()

        # Tables: basic conversion
        if stripped.startswith("{|"):
            line = ""
        elif stripped.startswith("|}"):
            line = ""
        elif stripped.startswith("|-"):
            line = "---"
        elif stripped.startswith("!"):
            cells = re.split(r"\s*!!\s*", stripped[1:])
            line = "| " + " | ".join(c.strip() for c in cells) + " |"
        elif stripped.startswith("|") and not stripped.startswith("|}") and not stripped.startswith("{|"):
            cells = re.split(r"\s*\|\|\s*", stripped[1:])
            line = "| " + " | ".join(c.strip() for c in cells) + " |"

        result.append(line)

    t = "\n".join(result)

    # Simple templates: {{Main|Page}} -> *Main article: Page*
    t = re.sub(r"\{\{[Mm]ain\|(.+?)\}\}", r"*Main article: \1*", t)
    t = re.sub(r"\{\{[Ss]ee [Aa]lso\|(.+?)\}\}", r"*See also: \1*", t)

    # Remove remaining simple templates (keep content if single param)
    t = re.sub(r"\{\{[Ss]tub\}\}", r"*(This article is a stub)*", t)
    t = re.sub(r"\{\{[Qq]uote\|([^}]+)\}\}", r'> \1', t)

    # Remove remaining templates (multi-line already removed above)
    t = re.sub(r"\{\{[^}]{0,200}\}\}", "", t)

    # Clean up multiple blank lines
    t = re.sub(r"\n{4,}", "\n\n\n", t)

    # Remove __TOC__, __NOTOC__ etc
    t = re.sub(r"__[A-Z]+__", "", t)

    return t.strip()


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    xml_path = os.path.join(script_dir, XML_PATH)
    output_dir = os.path.join(script_dir, OUTPUT_DIR)
    os.makedirs(output_dir, exist_ok=True)

    # Track latest revision per page (XML has all revisions, we want the latest)
    pages = {}  # title -> (ns, text, timestamp)

    print("Parsing XML dump...")
    context = ET.iterparse(xml_path, events=("end",))

    current_title = None
    current_ns = None
    current_text = None
    current_timestamp = None

    for event, elem in context:
        tag = elem.tag.replace(NS, "")

        if tag == "title":
            current_title = elem.text
        elif tag == "ns":
            current_ns = elem.text
        elif tag == "timestamp":
            current_timestamp = elem.text
        elif tag == "text":
            current_text = elem.text or ""
        elif tag == "revision":
            if current_title and current_ns in ALLOWED_NS:
                existing = pages.get(current_title)
                if not existing or (current_timestamp and current_timestamp > existing[2]):
                    pages[current_title] = (current_ns, current_text, current_timestamp or "")
        elif tag == "page":
            current_title = None
            current_ns = None
            current_text = None
            current_timestamp = None
            elem.clear()

    print(f"Found {len(pages)} content pages. Converting to Markdown...")

    # Convert and write
    count = 0
    skipped = 0
    for title, (ns, text, timestamp) in sorted(pages.items()):
        if not text or len(text.strip()) < 10:
            skipped += 1
            continue

        # Skip redirects
        if text.strip().upper().startswith("#REDIRECT"):
            skipped += 1
            continue

        md_content = wikitext_to_markdown(text)
        if len(md_content.strip()) < 10:
            skipped += 1
            continue

        filename = sanitize_filename(title) + ".md"
        filepath = os.path.join(output_dir, filename)

        header = f"# {title}\n\n"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(header + md_content + "\n")

        count += 1

    print(f"Done! {count} markdown files created, {skipped} skipped.")
    print(f"Output: {output_dir}")


if __name__ == "__main__":
    main()
