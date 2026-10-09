#!/usr/bin/env python3
"""Check that each post's .post-content body is byte-identical to a reference git revision.
Usage: python3 tools/verify_bodies.py [rev]   (default: master)"""
import re, subprocess, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
rev = sys.argv[1] if len(sys.argv) > 1 else 'master'
def inner(s):
    st = re.search(r'<div class="post-content">', s).end(); d = 1
    for t in re.finditer(r'<div\b|</div>', s[st:]):
        d += 1 if t.group() == '<div' else -1
        if d == 0: return s[st:st+t.start()]
bad = 0
for p in sorted((ROOT/'blog'/'posts').glob('*/index.html')):
    rel = p.relative_to(ROOT).as_posix()
    old = subprocess.run(['git','show',f'{rev}:{rel}'],cwd=ROOT,capture_output=True,text=True).stdout
    same = inner(old).encode() == inner(p.read_text()).encode()
    print('OK  ' if same else 'DIFF', rel); bad += not same
sys.exit(bad)
