"""Convert a markdown deep-dive draft into a <template id="dd-…"> block for deepdives.html.
Usage: python3 tools/md2dd.py draft.md dd-id >> deepdives.html
Handles: # title (first) / ## h4 / ### h5 (uppercase ### becomes a kicker) / * and 1. lists /
> quote -> .warn / | tables | / --- rules / [text](url) links / **bold** / SOURCES block of bare URLs."""
import re, html, sys
LABELS={}
def inline(t):
    t=html.escape(t,quote=False)
    t=re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)', lambda m: f'<a href="{m.group(2)}" target="_blank" rel="noopener">{m.group(1)} ↗</a>', t)
    t=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',t)
    t=t.replace(' — ',': ').replace('—',', ').replace('’',"'").replace('“','"').replace('”','"')
    return t
def convert(md, tid, labels=None):
    L=dict(LABELS); L.update(labels or {})
    lines=md.strip('\n').split('\n'); out=[]; title=''; lst=None; src=[]; in_src=False; tbl=[]
    def close():
        nonlocal lst, tbl
        if lst: out.append(f'</{lst}>'); lst=None
        if tbl:
            rows=[r for r in tbl if not re.match(r'^\|\s*-',r)]
            cells=lambda r:[c.strip() for c in r.strip().strip('|').split('|')]
            h=cells(rows[0]); t='<table class="spec-table"><tr>'+''.join(f'<th>{inline(c)}</th>' for c in h)+'</tr>'
            for r in rows[1:]:
                cs=cells(r); hl=cs[0].startswith('**')
                t+=('<tr class="hl">' if hl else '<tr>')+''.join('<td>'+inline(c).replace('<b>','').replace('</b>','')+'</td>' for c in cs)+'</tr>'
            out.append(t+'</table>'); tbl=[]
    for ln in lines:
        s=ln.rstrip()
        if in_src:
            if s.startswith('http'): src.append(s.strip())
            continue
        if s.startswith('|'):
            if lst: out.append(f'</{lst}>'); lst=None
            tbl.append(s); continue
        if tbl: close()
        if not s: close(); continue
        if s=='---': close(); out.append('<hr>'); continue
        if s.startswith('# '):
            if not title: title=inline(s[2:])
            else: close(); out.append(f'<h4 class="big-h">{inline(s[2:])}</h4>')
            continue
        if re.match(r'^\**(###\s*)?sources:?\**$', s.strip(), re.I): close(); in_src=True; continue
        if s.startswith('## '): close(); out.append(f'<h4>{inline(s[3:])}</h4>'); continue
        if s.startswith('### '):
            close(); txt=s[4:]
            if txt.isupper(): out.append(f'<p class="dd-kicker">{inline(txt.capitalize())}</p>')
            else: out.append(f'<h5>{inline(txt)}</h5>')
            continue
        if s.startswith('> '): close(); out.append(f'<div class="warn">{inline(s[2:])}</div>'); continue
        if s.startswith('* '):
            if lst!='ul': close(); out.append('<ul>'); lst='ul'
            out.append(f'<li>{inline(s[2:])}</li>'); continue
        m=re.match(r'^(\d+)\. (.*)',s)
        if m:
            if lst!='ol': close(); out.append('<ol class="num">'); lst='ol'
            out.append(f'<li>{inline(m.group(2))}</li>'); continue
        close(); out.append(f'<p>{inline(s)}</p>')
    close()
    if src:
        links='; '.join(f'<a href="{u}" target="_blank" rel="noopener">{L.get(u,u)}</a>' for u in src)
        out.append(f'<p class="src"><b>Sources:</b> {links}.</p>')
    body='\n    '.join(out)
    return f'\n<template id="{tid}" data-k="" data-h="{title}">\n  <div class="detail-body">\n    {body}\n  </div>\n</template>\n'
if __name__=='__main__':
    print(convert(open(sys.argv[1]).read(), sys.argv[2]))
