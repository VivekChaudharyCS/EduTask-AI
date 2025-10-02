import os
import requests

def recommend_resources(query: str):
    # Read API key at call time to avoid issues with late env loading
    yt_key = os.getenv("YOUTUBE_API_KEY")
    if yt_key:
        try:
            r = requests.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "q": query,
                    "maxResults": 8,
                    "type": "video",
                    "order": "relevance",
                    "key": yt_key,
                },
                timeout=10,
            )
            r.raise_for_status()
            items = r.json().get("items", [])
            out = []
            for it in items:
                vid = it.get("id", {}).get("videoId")
                sn = it.get("snippet", {})
                if not vid or not sn:
                    continue
                out.append({
                    "type": "youtube",
                    "title": sn.get("title", "Video"),
                    "url": f"https://www.youtube.com/watch?v={vid}",
                    "channelOrSource": sn.get("channelTitle", "YouTube"),
                    "qualityScore": 0.6,
                    "relevanceScore": 0.8,
                })
            if out:
                return out
        except Exception:
            pass
    # fallback recommended resources (more items)
    sample = [
        {"type": "youtube", "title": f"{query} - Intro (Sample video)", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "channelOrSource": "Sample Channel", "qualityScore": 0.7, "relevanceScore": 0.9},
        {"type": "web", "title": f"{query} - Article", "url": "https://example.com/article", "channelOrSource": "Example.com", "qualityScore": 0.6, "relevanceScore": 0.8},
        {"type": "web", "title": f"{query} - Tutorial", "url": "https://example.com/tutorial", "channelOrSource": "Example.com", "qualityScore": 0.6, "relevanceScore": 0.75},
        {"type": "web", "title": f"{query} - Best practices", "url": "https://example.com/best-practices", "channelOrSource": "Example.com", "qualityScore": 0.65, "relevanceScore": 0.78},
        {"type": "web", "title": f"{query} - Cheatsheet", "url": "https://example.com/cheatsheet", "channelOrSource": "Example.com", "qualityScore": 0.55, "relevanceScore": 0.7},
    ]
    return sample
