import sys
import urllib.request
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

def query_innertube(video_id):
    url = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false"
    data = {
        "videoId": video_id,
        "context": {
            "client": {
                "clientName": "WEB",
                "clientVersion": "2.20241001.01.00",
                "hl": "vi",
                "gl": "VN"
            }
        }
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
        }
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        details = res.get("videoDetails", {})
        return {
            "title": details.get("title"),
            "viewCount": details.get("viewCount"),
            "author": details.get("author"),
            "lengthSeconds": details.get("lengthSeconds"),
            "channelId": details.get("channelId")
        }

def query_page_html(video_id):
    url = f"https://www.youtube.com/watch?v={video_id}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
            "Accept-Language": "vi-VN,vi;q=0.9"
        }
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
    
    # Extract exact view count
    vc_match = re.search(r'"viewCount":"(\d+)"', html)
    raw_vc = vc_match.group(1) if vc_match else None

    # Extract human readable view count
    view_text_match = re.search(r'"viewCount":\{"videoViewCountRenderer":\{"viewCount":\{"simpleText":"([^"]+)"\}', html)
    simple_views = view_text_match.group(1) if view_text_match else None

    # Extract upload date
    date_match = re.search(r'"publishDate":"([^"]+)"', html)
    date = date_match.group(1) if date_match else None

    return {
        "raw_views": raw_vc,
        "simple_views": simple_views,
        "date": date
    }

if __name__ == "__main__":
    vid = "OC4aGfMpViU"
    print("=" * 65)
    print("🔍 ĐANG TRUY VẤN DỮ LIỆU GỐC TRỰC TIẾP TỪ HỆ THỐNG YOUTUBE...")
    print("=" * 65)
    
    try:
        api_data = query_innertube(vid)
        html_data = query_page_html(vid)

        print(f"🎬 Video: {api_data.get('title')}")
        print(f"📺 Kênh phát: {api_data.get('author')}")
        print(f"⏱️ Thời lượng: {api_data.get('lengthSeconds')} giây (~9 phút 21 giây)")
        print(f"🔗 URL: https://www.youtube.com/watch?v={vid}")
        print("-" * 65)
        print(f"📊 LƯỢT XEM CHÍNH THỨC TRÊN YOUTUBE:")
        print(f"   👉 Số lượt xem chính xác (Innertube Backend): {api_data.get('viewCount')} lượt xem")
        if html_data.get("simple_views"):
            print(f"   👉 Hiển thị trên giao diện web: {html_data.get('simple_views')}")
        print("=" * 65)
    except Exception as e:
        print("Lỗi truy vấn:", e)
