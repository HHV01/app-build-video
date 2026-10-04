import os,json,html,re
import pdfplumber,pypdfium2 as pdfium
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Image,KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
BASE=r'C:/Users/VNTT/Desktop/Video'
WORK=BASE+'/tmp/pdfs'
OUT=BASE+'/output/pdf'
os.makedirs(OUT,exist_ok=True)
pages=json.load(open(WORK+'/source_pages.json',encoding='utf-8'))
cache=json.load(open(WORK+'/translations_vi.json',encoding='utf-8'))
notes=json.load(open(WORK+'/image_notes_vi.json',encoding='utf-8'))
assert len(cache)==len(pages)==88
assert all(cache[str(p['page'])]['translation'].strip() for p in pages if (p['text'] or '').strip())
pdfmetrics.registerFont(TTFont('ArialVI',r'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialVIBold',r'C:/Windows/Fonts/arialbd.ttf'))
body=ParagraphStyle('Body',fontName='ArialVI',fontSize=10.5,leading=15.5,spaceAfter=10,textColor=HexColor('#202830'))
heading=ParagraphStyle('Heading',fontName='ArialVIBold',fontSize=13,leading=18,spaceAfter=14,textColor=HexColor('#216348'))
caption=ParagraphStyle('Caption',fontName='ArialVI',fontSize=9,leading=13,spaceBefore=5,spaceAfter=12,textColor=HexColor('#3a4751'))
source=pdfplumber.open(r'C:/Users/VNTT/Downloads/STICKMAN FINANCE MODULE PDF.pdf')
raster=pdfium.PdfDocument(r'C:/Users/VNTT/Downloads/STICKMAN FINANCE MODULE PDF.pdf')
story=[]
mapping=[]
text_export=[]
def para(t,style=body):return Paragraph(html.escape(t).replace('\n','<br/>'),style)
for p in pages:
    n=p['page']; k=str(n)
    if n>1:story.append(PageBreak())
    title='Trang nguồn '+k
    if n==1:title='TÀI LIỆU TÀI CHÍNH NGƯỜI QUE - BẢN TIẾNG VIỆT'
    if n==72:title='Trang nguồn 72 - Phong cách hoạt hình'
    if n==81:title='Trang nguồn 81 - Thumbnail tham chiếu'
    if n==86:title='Trang nguồn 86 - Kênh tham chiếu'
    story.append(para(title,heading))
    if n==1:
        story.append(para('Bản dịch đầy đủ theo thứ tự 88 trang nguồn. Văn bản được dàn lại để đọc rõ tiếng Việt nên số trang đầu ra có thể khác bản gốc. Các ảnh tham chiếu được giữ nguyên; bản dịch chữ nhìn thấy trong ảnh đặt ngay dưới từng ảnh. Tên kênh, tên người, tài khoản và số liệu được giữ theo nguồn.',caption))
    txt=cache[k]['translation']
    text_export.append('=== TRANG NGUỒN '+k+' ===\n'+txt)
    for block in txt.split('\n\n'):
        if block.strip():story.append(para(block))
    for j,img in enumerate(source.pages[n-1].images):
        pil=raster[n-1].render(scale=2).to_pil().convert('RGB')
        bounds=[img['x0']*2,img['top']*2,img['x1']*2,img['bottom']*2]
        pil=pil.crop(tuple(round(v) for v in bounds))
        file=WORK+'/image_'+k+'_'+str(j+1)+'.png'
        pil.save(file)
        width=468; height=width*pil.height/pil.width
        if height>320:width*=320/height;height=320
        flow=Image(file,width=width,height=height)
        story.append(flow)
        text=notes.get(k,[])
        if j<len(text):
            story.append(para('Chữ trong ảnh '+str(j+1)+': '+text[j],caption))
            text_export.append('Chữ trong ảnh '+str(j+1)+': '+text[j])
        story.append(Spacer(1,8))
def footer(c,d):
    c.saveState();c.setFont('ArialVI',8);c.setFillColor(HexColor('#65727c'))
    c.drawString(54,30,'TÀI LIỆU TÀI CHÍNH NGƯỜI QUE | TIẾNG VIỆT')
    c.drawRightString(558,30,str(d.page));c.restoreState()
path=OUT+'/STICKMAN_FINANCE_MODULE_Tieng_Viet.pdf'
doc=SimpleDocTemplate(path,pagesize=(612,792),rightMargin=54,leftMargin=54,topMargin=48,bottomMargin=50,title='Tài liệu tài chính người que - Bản tiếng Việt',author='Bản dịch tiếng Việt')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
open(OUT+'/STICKMAN_FINANCE_MODULE_Tieng_Viet.txt','w',encoding='utf-8-sig').write('\n\n'.join(text_export))
from pypdf import PdfReader
reader=PdfReader(path)
report={'source_pages':len(pages),'translated_text_pages':sum(bool(p['text']) for p in pages),'image_count':sum(len(p.images) for p in source.pages),'output_pages':len(reader.pages),'file':path,'missing_source_labels':[n for n in range(2,89) if not any('Trang nguồn '+str(n) in (p.extract_text() or '') for p in reader.pages)]}
json.dump(report,open(WORK+'/qa_report.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
print(json.dumps(report,ensure_ascii=False))
