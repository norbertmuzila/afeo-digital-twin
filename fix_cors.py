import codecs

with codecs.open("server.js", "r", encoding="utf-8") as f:
    server = f.read()

server = server.replace(
    "    'https://wafeo.vercel.app',",
    "    'https://wafeo.vercel.app',\n    'https://wafeo-webapplication.vercel.app',"
)

with codecs.open("server.js", "w", encoding="utf-8") as f:
    f.write(server)

print("CORS origin added for wafeo-webapplication.vercel.app")
