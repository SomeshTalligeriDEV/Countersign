#!/usr/bin/env python3
"""Render every PDF page for human review. Rendering is not visual acceptance."""
from pathlib import Path
import datetime,hashlib,json,sys
paper=Path(__file__).resolve().parent
pdf=Path(sys.argv[1]) if len(sys.argv)>1 else paper/'COUNTERSIGN-Research-Paper.pdf'
if not pdf.is_file():
    print('BLOCKED: manuscript PDF does not exist. No pages inspected.');sys.exit(1)
try:import fitz
except ImportError:
    print('BLOCKED: optional PyMuPDF renderer is not installed.');sys.exit(1)
out=paper/'quality'/('pages-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
out.mkdir(parents=True)
report={'pdf_sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'pages':[],
        'visual_acceptance':'NOT TESTED: inspect each generated page image manually'}
with fitz.open(pdf) as doc:
    for i,page in enumerate(doc):
        name=f'page-{i+1:03d}.png';page.get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(out/name)
        text=page.get_text();(out/f'page-{i+1:03d}.txt').write_text(text)
        outside=[]
        for block in page.get_text('blocks'):
            box=fitz.Rect(block[:4])
            if not (page.rect+(-1,-1,1,1)).contains(box):outside.append(list(box))
        report['pages'].append({'number':i+1,'image':name,'text_chars':len(text),
          'possibly_blank':not text.strip(),'replacement_character':'\ufffd' in text,'outside_media_box':outside})
(out/'inspection.json').write_text(json.dumps(report,indent=2)+'\n')
print(str(out/'inspection.json'))
