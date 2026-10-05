import sys
import urllib.request
import re
import json

sys.stdout.reconfigure(encoding='utf-8')

def get_yt_views(video_id):
    url = f"https://www.youtube.com/watch?v={video_id}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')

        # 1. Look for viewCount in ytInitialPlayerResponse
        match = re.search(r'"viewCount":"(\d+)"', html)
        views = match.group(1) if match else None

        # 2. Look for title
        match_title = re.search(r'<title>(.*?)</title>', html)
        title = match_title.group(1).replace(" - YouTube", "") if match_title else "N/A"

        # 3. Look for likes
        match_likes = re.search(r'"defaultText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]*thích[^"]*)"', html)
        likes = match_likes.group(1) if match_likes else "N/A"

        return {
            "title": title,
            "views": views,
            "likes": likes
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    video_id = "OC4aGfMpViU"
    data = get_yt_views(video_id)
    print("=" * 60)
    print(f"🎬 VIDEO YOUTUBE: https://www.youtube.com/watch?v={video_id}")
    print(f"📌 Tiêu đề: {data.get('title')}")
    print(f"👁️ Lượt xem công khai trên YouTube: {data.get('views', 'Đang cập nhật...')} lượt xem")
    if data.get('likes') != "N/A":
        print(f"👍 Lượt thích: {data.get('likes')}")
    print("=" * 60)
