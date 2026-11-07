#!/usr/bin/env python3
"""Build in a fresh directory; downloads require an explicit option. Preserve measurements."""
from pathlib import Path
import argparse, datetime, hashlib, json, os, re, shutil, subprocess, sys
paper=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--engine', choices=['auto','latexmk','pdflatex','tectonic'], default='auto')
parser.add_argument('--allow-downloads', action='store_true', help='Allow Tectonic to fetch TeX resources; cached-only by default')
parser.add_argument('--timeout', type=int, default=180, help='Maximum seconds per build command (default: 180)')
a=parser.parse_args()
if a.timeout <= 0: parser.error('--timeout must be positive')
engine=next((x for x in ['latexmk','pdflatex','tectonic'] if shutil.which(x)),None) if a.engine=='auto' else a.engine
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
out=paper/'quality'/('build-'+stamp)
out.mkdir(parents=True)
files=[paper/'main.tex',paper/'references.bib']+sorted((paper/'figures').glob('*.tex'))
for p in files:
    dest=out/p.relative_to(paper);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
report={'engine':engine,'scope':'Local manuscript compilation only; no submission or visual acceptance',
        'inputs':{str(p.relative_to(paper)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},
        'downloads_requested':a.allow_downloads,'commands':[],'status':'BLOCKED','pdf_copied':False,'visual_review':'NOT TESTED'}
env=dict(os.environ)
env.setdefault('TECTONIC_CACHE_DIR','/tmp/countersign-tectonic-cache')
commands=[]
if engine and shutil.which(engine):
    version=subprocess.run([engine,'--version'],capture_output=True,text=True)
    (out/'tool-version.txt').write_text(version.stdout+version.stderr)
    if engine=='latexmk':
        commands=[['latexmk','-pdf','-interaction=nonstopmode','-halt-on-error','-file-line-error','-no-shell-escape','main.tex']]
    elif engine=='pdflatex':
        if shutil.which('bibtex'):
            tex=['pdflatex','-interaction=nonstopmode','-halt-on-error','-file-line-error','-no-shell-escape','main.tex']
            commands=[tex,['bibtex','main'],tex,tex]
        else: report['blocker']='bibtex executable missing'
    else:
        commands=[['tectonic']+([] if a.allow_downloads else ['--only-cached'])+['--untrusted','--keep-logs','--keep-intermediates','main.tex']]
else: report['blocker']=f'{engine or "A TeX engine"} executable not found on PATH. Install that engine or select an installed one with --engine.'
for i,cmd in enumerate(commands):
    try:
        p=subprocess.run(cmd,cwd=out,env=env,capture_output=True,text=True,timeout=a.timeout)
        rc=p.returncode;output=p.stdout+p.stderr
    except subprocess.TimeoutExpired:
        rc=124;output=f'Build exceeded {a.timeout}-second deadline. No successful build claimed.\n'
    (out/f'command-{i+1}.txt').write_text(output)
    report['commands'].append({'argv':cmd,'exit':rc,'log':f'command-{i+1}.txt'})
    if rc:
        report['blocker']='TeX command failed; inspect diagnostic log'
        break
else:
    if commands:
        pdf=out/'main.pdf'
        log=(out/'main.log').read_text(errors='replace') if (out/'main.log').exists() else ''
        problems=re.findall(r'^.*(?:undefined|Missing character|Overfull \\[hv]box|Emergency stop).*$' ,log,re.M)
        report['tex_diagnostics']=problems
        fatal=any('undefined' in x or 'Missing character' in x or 'Emergency stop' in x for x in problems)
        if pdf.exists() and pdf.read_bytes().startswith(b'%PDF-') and not fatal:
            source_unchanged=all(hashlib.sha256((paper/name).read_bytes()).hexdigest()==digest for name,digest in report['inputs'].items())
            report['source_unchanged_at_install']=source_unchanged
            report['pdf_sha256']=hashlib.sha256(pdf.read_bytes()).hexdigest()
            if source_unchanged:
                target=paper/'COUNTERSIGN-Research-Paper.pdf'
                staged=paper/('.reader-'+stamp+'.pdf')
                shutil.copyfile(pdf,staged)
                os.replace(staged,target)
                report['reader_pdf_sha256']=hashlib.sha256(target.read_bytes()).hexdigest()
                report.update(status='PASS',pdf_copied=True)
                if (out/'main.bbl').exists():shutil.copyfile(out/'main.bbl',paper/'main.bbl')
            else: report.update(status='FAIL',blocker='Sources changed during compilation; built PDF preserved but reader not replaced')
        else: report.update(status='FAIL',blocker='Missing PDF or unresolved citations/glyphs; inspect log')
(out/'result.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'status':report['status'],'engine':engine,'result':str(out/'result.json'),'pdf_copied':report['pdf_copied'],'blocker':report.get('blocker')},indent=2))
sys.exit(0 if report['status']=='PASS' else 1)
