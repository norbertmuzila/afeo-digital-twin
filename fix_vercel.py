import json

with open("vercel.json", "r", encoding="utf-8-sig") as f:
    data = json.load(f)

with open("vercel.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("vercel.json rewritten without BOM")
