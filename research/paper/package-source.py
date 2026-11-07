#!/usr/bin/env python3
"""Allowlisted deterministic paper archive; no credentials, PDFs or build detritus."""
from pathlib import Path
import hashlib,json,subprocess,sys,zipfile
p=Path(__file__).resolve().parent
subprocess.run([sys.executable,str(p/'verify-source.py')],check=True,stdout=subprocess.DEVNULL)
names=['main.tex','references.bib','README.md','build.py','verify-source.py','generate-gas-figure.py','package-source.py','inspect-pdf.py','REPRODUCIBILITY.md']
paths={n:p/n for n in names}
for f in sorted((p/'figures').iterdir()):
    if f.suffix in ['.tex','.svg','.json']:paths[str(f.relative_to(p))]=f
for name in ['gas.csv','benchmark-provenance.json']:
    source=p.parent/'results'/name
    if not source.exists():source=p/'data'/name
    paths['data/'+name]=source
manifest={'scope':'Source preparation only. Local PDF compilation is recorded separately. arXiv compatibility and human author/license approval remain outstanding.',
 'files':{n:{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size} for n,f in sorted(paths.items())}}
payloads={n:f.read_bytes() for n,f in paths.items()}
payloads['SOURCE-MANIFEST.json']=(json.dumps(manifest,indent=2)+'\n').encode()
archive=p/'COUNTERSIGN-arxiv-source.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as z:
    for n,data in sorted(payloads.items()):
        info=zipfile.ZipInfo(n,date_time=(2026,11,7,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
        info.external_attr=0o100644<<16;z.writestr(info,data)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert all(not n.startswith('/') and '..' not in Path(n).parts for n in z.namelist())
    for n,meta in manifest['files'].items():assert hashlib.sha256(z.read(n)).hexdigest()==meta['sha256']
result={'status':'PASS','archive':archive.name,'entries':len(payloads),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),
 'claims':'ZIP integrity and allowlisted source closure; local PDF built separately, arXiv compilation untested, no submission approval'}
(p/'quality/archive-checks.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
