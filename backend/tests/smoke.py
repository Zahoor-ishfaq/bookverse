import json, urllib.request, sys
import os
B=os.environ.get("API_URL","http://localhost:8000")
import time
EMAIL=f"tester{time.time_ns()%1000000}@example.com"
def call(m, p, body=None, tok=None, raw=False):
    req=urllib.request.Request(B+p, method=m, data=json.dumps(body).encode() if body is not None else None, headers={"Content-Type":"application/json", **({"Authorization":"Bearer "+tok} if tok else {})})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: d=r.read(); return r.status, (d.decode() if raw else json.loads(d))
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read())
ok=lambda n,c,exp=200: print(("PASS" if c==exp else f"FAIL({c})"), n)
s,r=call("POST","/api/auth/register",{"name":"Test Reader","email":EMAIL,"password":"password123","consents":{"acceptedTerms":True,"marketingOptIn":False}}); ok("register",s); tok=r["accessToken"]; ref=r["refreshToken"]; me_name=r["user"]["username"]
s,r=call("POST","/api/auth/register",{"name":"Dup","email":EMAIL,"password":"password123","consents":{"acceptedTerms":True}}); ok("duplicate email rejected",s,409)
s,r=call("POST","/api/auth/login",{"email":"amira@example.com","password":"password123"}); ok("seed user login",s); amira=r["accessToken"]
s,r=call("POST","/api/auth/login",{"email":"amira@example.com","password":"wrong"}); ok("wrong password rejected",s,401)
s,r=call("GET","/api/auth/me",tok=tok); ok("me",s); print("   user:",r["username"],r["email"])
s,r=call("POST","/api/auth/refresh",{"refreshToken":ref}); ok("refresh rotates",s); tok=r["accessToken"]
s,r=call("PUT","/api/shelves",{"bookId":84,"shelf":"want_to_read"},tok); ok("shelf",s)
s,r=call("PUT","/api/progress",{"bookId":84,"chapter":2,"paragraph":5,"percentage":12.5,"minutesDelta":11},tok); ok("progress + minutes",s); print("   streak:",r["streak"])
s,r=call("POST","/api/highlights",{"bookId":84,"chapter":2,"text":"Beware; for I am fearless, and therefore powerful.","color":"yellow"},tok); ok("highlight",s)
s,r=call("PUT","/api/reviews",{"bookId":84,"rating":4.5,"title":"Brilliant and strange","body":"A masterpiece, gorgeous and unsettling."},tok); ok("review",s); print("   sentiment:",r["sentiment"]); rid=r["id"]
s,r=call("POST",f"/api/reviews/{rid}/like",tok=amira); ok("amira likes review",s)
s,r=call("GET","/api/books/84/reviews"); ok("public reviews",s); print("   count:",r["count"],"avg:",r["average"])
s,r=call("POST","/api/diary",{"title":"Rainy evening","body":"Read two chapters by the window.","mood":"calm"},tok); ok("diary",s)
s,r=call("POST","/api/users/amira.reads/follow",tok=tok); ok("follow",s)
s,r=call("POST","/api/clubs",{"name":"Sunday Russians","description":"One Dostoevsky a month.","currentBookId":2554},tok); ok("create club",s); cid=r["id"]
s,r=call("POST",f"/api/clubs/{cid}/join",tok=amira); ok("amira joins club",s); print("   members:",r["memberCount"])
s,r=call("POST",f"/api/clubs/{cid}/threads",{"chapter":1,"title":"First impressions","body":"Loved the opening."},tok); ok("thread",s); tid=r["id"]
s,r=call("POST",f"/api/threads/{tid}/replies",{"body":"Same!"},amira); ok("reply (member)",s)
s,r=call("POST","/api/rooms/r_dorian/messages",{"text":"Hello from the API test"},tok); ok("room message",s)
s,r=call("POST","/api/debates/d_quixote/vote",{"side":"b","argument":"Part Two is the first metafiction."},tok); ok("vote",s)
s,r=call("POST","/api/stories",{"title":"The Ferry","tagline":"A missed boat.","chapter":{"title":"One","content":["She missed the ferry on purpose."]}},tok); ok("story",s); sid=r["id"]
s,r=call("POST",f"/api/stories/{sid}/like",tok=amira); ok("story like",s)
s,r=call("POST","/api/books/publish",{"title":"Notes From The Harbour","authorName":"Test Reader","description":"Short essays.","chapters":[{"title":"Morning","paragraphs":["The harbour wakes before the town does. "*12]}]},tok); ok("publish book",s); bid=r["id"]; print("   book id:",bid)
s,r=call("GET",f"/api/books/{bid}"); ok("published book readable publicly",s)
s,r=call("GET",f"/api/books/{bid}/text"); ok("published book text",s)
s,r=call("GET","/api/books/community"); ok("community books list",s); print("   n:",len(r))
s,r=call("GET","/api/books/1342"); ok("gutenberg meta via cache",s); print("   ",r.get("title"))
s,r=call("GET","/api/books/1342/text",raw=True); ok("gutenberg text via cache",s); print("   bytes:",len(r))
s,r=call("GET","/api/books/1342/text",raw=True); ok("gutenberg text second hit (cached)",s)
s,r=call("GET","/api/challenges",tok=tok); ok("challenges",s)
s,r=call("POST","/api/challenges/ch_autumn/join",tok=tok); ok("join challenge",s)
s,r=call("GET","/api/notifications",tok=amira); ok("amira notifications",s); print("   ",[n["title"] for n in r][:4])
s,r=call("GET","/api/feed",tok=tok); ok("feed",s); print("   items:",len(r), "kinds:", sorted(set(i["kind"] for i in r)))
s,r=call("GET","/api/search?q=harbour"); ok("search",s); print("   community books found:",len(r["communityBooks"]))
s,r=call("GET",f"/api/users/{me_name}"); ok("public profile",s); print("   published:",r["published"],"followers:",r["followers"],"following:",r["following"])
s,r=call("GET","/api/me/library",tok=tok); ok("library bootstrap",s); print("   keys:",sorted(r.keys()))
s,r=call("GET","/api/me/export",tok=tok); ok("export",s)
s,r=call("POST","/api/auth/forgot",{"email":EMAIL}); ok("forgot password (logs link)",s)
s,r=call("PATCH","/api/me",{"headline":"Essayist","links":{"website":"https://harbour.example","x":"harbour"}},tok); ok("profile update",s); print("   links:",r["links"])
