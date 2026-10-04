import sys, os, json, re, time, urllib.request, urllib.parse, concurrent.futures
sys.stdout.reconfigure(encoding='utf-8')
BASE = r'C:/Users/VNTT/Desktop/Video'
WORK = BASE + '/tmp/pdfs'
SOURCE = r'C:/Users/VNTT/Downloads/STICKMAN FINANCE MODULE PDF.pdf'
CACHE = WORK + '/translations_vi.json'
pages = json.load(open(WORK+'/source_pages.json',encoding='utf-8'))
cache = json.load(open(CACHE,encoding='utf-8')) if os.path.exists(CACHE) else {}
def normalize(text):
    return re.sub(r'\s*\n\s*',' ',text).strip()
def chunks(text, limit=2500):
    text=normalize(text)
    out=[]
    while len(text)>limit:
        cut=max(text.rfind('. ',0,limit),text.rfind('? ',0,limit),text.rfind('! ',0,limit))
        if cut<limit//3: cut=text.rfind(' ',0,limit)
        else: cut+=1
        out.append(text[:cut].strip());text=text[cut:].strip()
    if text:out.append(text)
    return out
def translate(text):
    query=urllib.parse.urlencode({'client':'gtx','sl':'en','tl':'vi','dt':'t','q':text})
    req=urllib.request.Request('https://translate.googleapis.com/translate_a/single?'+query,headers={'User-Agent':'Mozilla/5.0'})
    for attempt in range(5):
        try:
            data=json.loads(urllib.request.urlopen(req,timeout=45).read().decode('utf-8'))
            result=''.join(part[0] for part in data[0] if part and part[0])
            if not result.strip():raise ValueError('Empty translation')
            return result
        except Exception:
            if attempt==4:raise
            time.sleep(2*(attempt+1))
def one(page):
    key=str(page['page'])
    if key in cache:return key,cache[key]
    original=page['text'] or ''
    translated='\n\n'.join(translate(c) for c in chunks(original))
    return key,{'source':original,'translation':translated}
todo=[p for p in pages if str(p['page']) not in cache]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for f in concurrent.futures.as_completed([pool.submit(one,p) for p in todo]):
        k,v=f.result();cache[k]=v
        with open(CACHE,'w',encoding='utf-8') as out:json.dump(cache,out,ensure_ascii=False,indent=2)
        print('Translated source page '+k+' ('+str(len(cache))+'/'+str(len(pages))+')',flush=True)
print('TRANSLATION_COMPLETE',flush=True)
