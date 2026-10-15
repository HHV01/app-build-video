import argparse
import os
import json
from pathlib import Path
import av
import numpy as np

from faster_whisper import WhisperModel

parser = argparse.ArgumentParser()
parser.add_argument('audio')
parser.add_argument('output')
parser.add_argument('--cache', required=True)
parser.add_argument('--language', default='vi')
parser.add_argument('--model', default='small')
args = parser.parse_args()
if os.environ.get('STUDIO_WHISPER_CUDA') == '1':
    import torch
    torch_lib = str(Path(torch.__file__).parent / 'lib')
    os.add_dll_directory(torch_lib)
    os.environ['PATH'] = torch_lib + os.pathsep + os.environ['PATH']
model = WhisperModel(args.model, device='cuda' if os.environ.get('STUDIO_WHISPER_CUDA') == '1' else 'cpu', compute_type='float16' if os.environ.get('STUDIO_WHISPER_CUDA') == '1' else 'int8', cpu_threads=4, download_root=args.cache)
# Decode directly with PyAV: newer PyAV removed metadata_errors from av.open,
# while faster-whisper's file decoder still supplies that argument.
resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)
parts = []
with av.open(args.audio) as container:
    for frame in container.decode(audio=0):
        parts.extend(f.to_ndarray().reshape(-1) for f in resampler.resample(frame))
parts.extend(f.to_ndarray().reshape(-1) for f in resampler.resample(None))
if not parts:
    raise ValueError('Audio has no decoded samples')
audio = np.concatenate(parts).astype(np.float32) / 32768.0
segments, info = model.transcribe(audio, language=args.language, beam_size=3, word_timestamps=True, vad_filter=True)
words = []
for segment in segments:
    for word in segment.words or []:
        if word.word.strip() and word.end > word.start:
            words.append({'start': word.start, 'end': word.end, 'text': word.word.strip()})
Path(args.output).write_text(json.dumps({'segments': words, 'language': info.language}, ensure_ascii=False), encoding='utf-8')
