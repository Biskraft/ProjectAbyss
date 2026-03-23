import xml.etree.ElementTree as ET
import os
import re
import html

# File paths
xml_file = r"dataset_youtube-full-channel-transcripts-extractor_2026-01-19_08-11-19-303.xml"
output_dir = r"transcripts"

# Create output directory if it doesn't exist
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def sanitize_filename(filename):
    # Remove invalid characters for Windows filenames
    return re.sub(r'[<>:"/\\|?*]', '', filename).strip()

def main():
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
        
        count = 0
        for item in root.findall('item'):
            title_elem = item.find('title')
            if title_elem is None or not title_elem.text:
                continue
                
            title = title_elem.text
            safe_title = sanitize_filename(title)
            
            # Use 'captions' tags.
            # Based on the structure, there are multiple <captions> tags per item.
            captions = []
            for caption in item.findall('captions'):
                if caption.text:
                    # Unescape HTML entities just in case (e.g. &quot;, &#39;)
                    text = html.unescape(caption.text)
                    captions.append(text)
            
            if captions:
                full_text = " ".join(captions)
                output_path = os.path.join(output_dir, f"{safe_title}.txt")
                
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(full_text)
                
                count += 1
                print(f"Saved: {safe_title}.txt")
        
        print(f"Process complete. {count} transcripts extracted.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
