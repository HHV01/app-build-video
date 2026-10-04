"""Build a portrait Milo Short using the original narrator and local animation."""
from pathlib import Path
import sys
import subprocess
import json

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tmp' / 'shorts-deps'))
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
BUILD = ROOT / 'tmp' / 'shorts-build'
OUT = ROOT / 'assets' / 'shorts'
BUILD.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

def run(args):
    p = subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if p.returncode:
        raise RuntimeError(p.stderr[-6000:])

def clock(t):
    hundredths = round(t * 100)
    return f'{hundredths//360000}:{hundredths//6000%60:02d}:{hundredths//100%60:02d}.{hundredths%100:02d}'

segments = [(2, 5.0, 0.12), (3, 6.0, 0.35), (5, 10.5, 0.50), (6, 6.5, 0.55), (7, 5.5, 0.35), (33, 3.0, 0.0)]
duration = sum(s[1] for s in segments)
parts = []
for i, (scene, seconds, focus) in enumerate(segments):
    part = BUILD / f'portrait-{i:02d}.mp4'
    graph = (
        f'[0:v]setpts={seconds/8:.8f}*(PTS-STARTPTS),fps=30,split=2[b][f];'
        '[b]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,gblur=sigma=10,scale=1080:1920[bg];'
        f'[f]scale=1536:864,crop=1080:864:x=(iw-ow)*{focus}:y=0[fg];'
        '[bg][fg]overlay=0:500,'
        'drawbox=x=0:y=0:w=iw:h=475:color=0x062c25@0.86:t=fill,'
        'drawbox=x=0:y=1380:w=iw:h=540:color=0x062c25@0.90:t=fill,'
        'tpad=stop_mode=clone:stop_duration=1,format=yuv420p[v]'
    )
    run(['-i', ROOT / 'assets' / 'Animate' / f'{scene}.mp4', '-filter_complex', graph,
         '-map', '[v]', '-an', '-t', seconds, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', part])
    parts.append(part)
    print(f'Rendered scene {scene} ({seconds}s)', flush=True)

concat = BUILD / 'concat.txt'
concat.write_text('\n'.join(f"file '{p.as_posix()}'" for p in parts), encoding='utf-8')
run(['-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', BUILD / 'montage.mp4'])

captions = [
    (0, 2, 'Bỗng một bạn nhìn ra cửa sổ\\Nrồi hét lên...'),
    (2, 5, 'Ê! Ngoài cổng\\Ncó xe {\\c&H00E8FF&}MILO!'),
    (5, 8, 'Cả lớp tỉnh hơn cả lúc\\Ncô báo nghỉ kiểm tra!'),
    (8, 11, 'Người ta còn phát\\N{\\c&H00E8FF&}MIỄN PHÍ{\\c&HFFFFFF&} nữa!'),
    (11, 14, 'Tiếng trống vừa vang...'),
    (14, 16, 'Sân trường biến thành\\N{\\c&H00E8FF&}đại hội chạy tiếp sức!'),
    (16, 19, 'Bạn chạy nhanh nhất lớp\\Nchưa chắc mê thể thao.'),
    (19, 21.5, 'Có khi chỉ muốn nhận\\N{\\c&H00E8FF&}ly đầu tiên!'),
    (21.5, 23, 'Nhưng khoan đã...'),
    (23, 28, 'Vì sao chiếc xe xanh\\Nkhiến cả trường {\\c&H00E8FF&}náo loạn?'),
    (28, 30.5, 'MILO đã làm cách nào...'),
    (30.5, 33.5, '...để trở thành\\N{\\c&H00E8FF&}ký ức tuổi học trò?'),
    (33.5, duration, 'Xem câu chuyện đầy đủ\\Ntrên kênh {\\c&H00E8FF&}Tích Thông Thái!'),
]
ass = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial,72,&H00FFFFFF,&H000000FF,&H00101913,&H90000000,-1,0,0,0,100,100,0,0,1,5,2,5,80,160,0,1
Style: Hook,Arial,106,&H0000E8FF,&H000000FF,&H00101913,&H90000000,-1,0,0,0,100,100,0,0,1,6,3,5,40,40,0,1
Style: Small,Arial,40,&H00FFFFFF,&H000000FF,&H00101913,&H90000000,-1,0,0,0,100,100,1,0,1,2,0,5,40,40,0,1
Style: Subhook,Arial,59,&H00FFFFFF,&H000000FF,&H00101913,&H90000000,-1,0,0,0,100,100,0,0,1,3,1,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def event(start, end, style, text, position):
    return f'Dialogue: 0,{clock(start)},{clock(end)},{style},,0,0,0,,{{\\pos({position[0]},{position[1]})}}{text}\n'
ass += event(0, duration, 'Small', 'TÍCH THÔNG THÁI', (540, 145))
ass += event(0, duration, 'Hook', 'XE MILO TỚI!', (540, 280))
ass += event(0, duration, 'Subhook', 'CẢ TRƯỜNG NÁO LOẠN!', (540, 397))
ass += event(0, 33.5, 'Small', 'Bạn từng xếp hàng nhận Milo chưa?', (480, 1745))
ass += event(33.5, duration, 'Small', 'Chọn video liên quan để xem tiếp', (480, 1745))
ass += event(33.5, duration, 'Caption', 'CÂU CHUYỆN\\NCHIẾC XE {\\c&H00E8FF&}MILO', (675, 965))
for start, end, text in captions:
    ass += event(start, end, 'Caption', text, (480, 1530))
asspath = BUILD / 'milo-short.ass'
asspath.write_text(ass, encoding='utf-8-sig')

def srtclock(t):
    ms = round(t * 1000)
    return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'
import re
srt = '\n\n'.join(f'{i}\n{srtclock(a)} --> {srtclock(b)}\n' + re.sub(r'\{[^}]*\}', '', text).replace('\\N', '\n') for i, (a,b,text) in enumerate(captions, 1))
(OUT / 'milo-short-01.srt').write_text(srt, encoding='utf-8-sig')

run(['-i', BUILD / 'montage.mp4', '-i', BUILD / 'milo-source.m4a', '-filter_complex',
     '[1:a]asplit=2[a][b];[a]atrim=start=33:end=44,asetpts=PTS-STARTPTS[a1];'
     '[b]atrim=start=61:end=83.5,asetpts=PTS-STARTPTS[a2];'
     '[a1][a2]concat=n=2:v=0:a=1,afade=t=out:st=33:d=0.5,apad=pad_dur=3[audio];'
     '[0:v]subtitles=tmp/shorts-build/milo-short.ass[v]',
     '-map', '[v]', '-map', '[audio]', '-t', duration, '-c:v', 'libx264',
     '-preset', 'fast', '-crf', '20', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
     OUT / 'milo-short-01.mp4'])
for label, t in [('opening', 3), ('middle', 15), ('ending', 35)]:
    run(['-ss', t, '-i', OUT / 'milo-short-01.mp4', '-frames:v', '1', BUILD / f'qa-{label}.png'])
print(json.dumps({'video': str(OUT / 'milo-short-01.mp4'), 'seconds': duration, 'bytes': (OUT / 'milo-short-01.mp4').stat().st_size}, ensure_ascii=False), flush=True)
