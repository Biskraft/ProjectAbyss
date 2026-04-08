"""
Demajen Metroidvania Maps Downloader
Downloads map images from demajen.co.uk via Google Drive links.

Usage:
    python download_demajen.py                  # Download all 150 games
    python download_demajen.py "Hollow Knight"  # Download specific game
    python download_demajen.py --list           # List all available games
"""

import requests
import re
import os
import sys
import json
import time

OUTPUT_DIR = "demajen_maps"
LINKS_URL = "https://www.demajen.co.uk/g/links.json"
GAMES_URL = "https://www.demajen.co.uk/games.json"

def get_links():
    """Fetch game key -> Google Drive folder URL mapping."""
    r = requests.get(LINKS_URL)
    r.raise_for_status()
    return r.json()

def get_games():
    """Fetch game metadata for title matching."""
    r = requests.get(GAMES_URL)
    r.raise_for_status()
    return r.json()

def extract_folder_id(url):
    """Extract folder ID from Google Drive URL."""
    m = re.search(r'folders/([A-Za-z0-9_-]+)', url)
    return m.group(1) if m else None

def is_google_doc_id(file_id):
    """Google Docs/Sheets/Slides IDs are typically 44 chars with specific patterns."""
    # Regular Drive file IDs: ~33 chars
    # Google Docs IDs: ~44 chars and contain more mixed chars
    return len(file_id) > 40

def list_drive_folder_files(folder_id, session):
    """Scrape file IDs from a public Google Drive folder page."""
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    r = session.get(url)
    # Extract unique file IDs (25+ char alphanumeric, not the folder itself)
    ids = re.findall(r'data-id="([A-Za-z0-9_-]{20,})"', r.text)
    unique = list(dict.fromkeys(ids))  # deduplicate preserving order
    # Remove folder ID, _gd marker, and Google Docs (not downloadable as images)
    filtered = []
    for fid in unique:
        if fid == folder_id or fid == "_gd":
            continue
        if is_google_doc_id(fid):
            print(f"  (skipping Google Doc: {fid[:20]}...)")
            continue
        filtered.append(fid)
    return filtered

def download_drive_file(file_id, output_path, session):
    """Download a file from Google Drive, handling virus scan warning."""
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    r = session.get(url, stream=True)

    content_type = r.headers.get('content-type', '')

    # If we got the actual file
    if 'image' in content_type or 'octet-stream' in content_type:
        with open(output_path, 'wb') as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        return True

    # If we got the virus scan warning page, extract uuid and retry
    text = r.text

    # Method 1: uuid-based (new Google Drive flow)
    uuid_match = re.search(r'uuid=([A-Za-z0-9_-]+)', text)
    if uuid_match:
        uuid = uuid_match.group(1)
        dl_url = f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t&uuid={uuid}"
        r2 = session.get(dl_url, stream=True)
        ct2 = r2.headers.get('content-type', '')
        if 'text/html' not in ct2 or int(r2.headers.get('content-length', 0)) > 10000:
            with open(output_path, 'wb') as f:
                for chunk in r2.iter_content(8192):
                    f.write(chunk)
            return True

    # Method 2: confirm=t (older Google Drive flow)
    r3 = session.get(f"{url}&confirm=t", stream=True)
    ct3 = r3.headers.get('content-type', '')
    if 'image' in ct3 or 'octet-stream' in ct3:
        with open(output_path, 'wb') as f:
            for chunk in r3.iter_content(8192):
                f.write(chunk)
        return True

    # Method 3: form action (virus scan confirmation page)
    action_match = re.search(r'action="([^"]+)"', text)
    if action_match:
        action_url = action_match.group(1).replace("&amp;", "&")
        if not action_url.startswith("http"):
            action_url = "https://drive.google.com" + action_url
        r4 = session.get(action_url, stream=True)
        ct4 = r4.headers.get('content-type', '')
        if 'text/html' not in ct4:
            with open(output_path, 'wb') as f:
                for chunk in r4.iter_content(8192):
                    f.write(chunk)
            return True

    # Method 4: export as image via Google Docs viewer (for non-native files)
    export_url = f"https://drive.google.com/uc?export=view&id={file_id}"
    r5 = session.get(export_url, stream=True, allow_redirects=True)
    ct5 = r5.headers.get('content-type', '')
    if 'image' in ct5:
        with open(output_path, 'wb') as f:
            for chunk in r5.iter_content(8192):
                f.write(chunk)
        return True

    print(f"  WARNING: Could not download {file_id} (might be a Google Doc/Sheet)")
    return False

def download_game(key, drive_url, game_title, session):
    """Download all files from a game's Google Drive folder."""
    folder_id = extract_folder_id(drive_url)
    if not folder_id:
        print(f"  ERROR: Could not extract folder ID from {drive_url}")
        return

    # Create game directory
    safe_title = re.sub(r'[<>:"/\\|?*]', '_', game_title)
    game_dir = os.path.join(OUTPUT_DIR, safe_title)
    os.makedirs(game_dir, exist_ok=True)

    # List files in folder
    file_ids = list_drive_folder_files(folder_id, session)
    if not file_ids:
        print(f"  No files found in folder")
        return

    print(f"  Found {len(file_ids)} file(s)")

    for i, fid in enumerate(file_ids, 1):
        output_path = os.path.join(game_dir, f"map_{i}.png")
        if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
            print(f"  [{i}/{len(file_ids)}] Already exists, skipping")
            continue

        print(f"  [{i}/{len(file_ids)}] Downloading {fid[:12]}...")
        success = download_drive_file(fid, output_path, session)
        if success:
            size = os.path.getsize(output_path)
            if size < 1000:
                print(f"  WARNING: File too small ({size}B), might be HTML error")
            else:
                print(f"  OK ({size:,} bytes)")

        time.sleep(0.5)  # Rate limiting

def main():
    # Setup session
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    })

    # Fetch data
    print("Fetching game list...")
    links = get_links()
    games = get_games()

    # Build title lookup
    title_map = {}
    for g in games:
        if g.get('thumbnailLink'):
            key = g['thumbnailLink'].split('/')[-1].lower()
            title_map[key] = g['title']

    # Handle arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "--list":
            print(f"\nAvailable games ({len(links)}):\n")
            for key in sorted(links.keys()):
                title = title_map.get(key, key)
                print(f"  {title} ({key})")
            return

        # Search for specific game
        search = sys.argv[1].lower()
        matched = {k: v for k, v in links.items()
                   if search in k.lower() or search in title_map.get(k, '').lower()}
        if not matched:
            print(f"No game found matching '{sys.argv[1]}'")
            return
        target_links = matched
    else:
        target_links = links

    # Download
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    total = len(target_links)

    for idx, (key, url) in enumerate(target_links.items(), 1):
        title = title_map.get(key, key)
        print(f"\n[{idx}/{total}] {title}")
        download_game(key, url, title, session)
        time.sleep(1)  # Rate limiting between games

    print(f"\nDone! Maps saved to ./{OUTPUT_DIR}/")

if __name__ == "__main__":
    main()
