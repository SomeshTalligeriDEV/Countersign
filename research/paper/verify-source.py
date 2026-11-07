#!/usr/bin/env python3
"""Check source closure, labels, metadata and plot provenance; not a TeX parser."""
from pathlib import Path
import hashlib,json,re,sys
p=Path(__file__).resolve().parent
seen=set(); missing=[]
def read(path):
    if path in seen:return ''
    seen.add(path)
    if not path.is_file():missing.append(str(path));return ''
    t=path.read_text()
    for name in re.findall(r'\\input\{([^}]+)\}',t):t+='\n'+read(p/(name+'.tex'))
    return t
tex=read(p/'main.tex'); bib=(p/'references.bib').read_text()
keys=re.findall(r'@\w+\{([^,]+),',bib)
cites={k.strip() for group in re.findall(r'\\cite\{([^}]+)\}',tex) for k in group.split(',')}
labels=re.findall(r'\\label\{([^}]+)\}',tex)
refs=re.findall(r'\\(?:ref|eqref)\{([^}]+)\}',tex)
stack=[]; env_errors=[]
for m in re.finditer(r'\\(begin|end)\{([^}]+)\}',tex):
    if m[1]=='begin':stack.append(m[2])
    elif not stack or stack.pop()!=m[2]:env_errors.append(m[0])
# Inputs are appended after the main document, but each is independently balanced.
provenance=json.loads((p/'figures/gas-provenance.json').read_text())
data=p.parent/'results/gas.csv'
if not data.exists():data=p/'data/gas.csv'
checks={'scope':'SOURCE ONLY: does not validate typesetting, scientific truth or arXiv acceptance',
'bibliography_entries':len(keys),'cited_entries':len(cites),'missing_inputs':missing,
'missing_citations':sorted(cites-set(keys)),'unused_references':sorted(set(keys)-cites),
'duplicate_bibkeys':sorted({k for k in keys if keys.count(k)>1}),
'missing_labels':sorted(set(refs)-set(labels)),
'duplicate_labels':sorted({k for k in labels if labels.count(k)>1}),
'environment_errors':env_errors+stack,
'gas_source_hash_matches':hashlib.sha256(data.read_bytes()).hexdigest()==provenance['source_sha256'],
'gas_output_hashes_match':all(hashlib.sha256((p/'figures'/f).read_bytes()).hexdigest()==h for f,h in provenance['outputs'].items()),
'python_syntax':{},'historical_results_unchanged':None}
for f in p.glob('*.py'):
    try:compile(f.read_text(),str(f),'exec');checks['python_syntax'][f.name]='PASS'
    except SyntaxError as e:checks['python_syntax'][f.name]=str(e)
before=p/'quality/historical-before.json'
if before.exists() and (p.parent/'results').exists():
    root=p.parents[1]
    checks['historical_results_unchanged']=all((root/f).exists() and hashlib.sha256((root/f).read_bytes()).hexdigest()==h for f,h in json.loads(before.read_text()).items())
errors=any(checks[k] for k in ['missing_inputs','missing_citations','duplicate_bibkeys','missing_labels','duplicate_labels','environment_errors'])
passed=not errors and checks['gas_source_hash_matches'] and checks['gas_output_hashes_match'] and all(v=='PASS' for v in checks['python_syntax'].values()) and checks['historical_results_unchanged'] is not False
checks['status']='PASS' if passed else 'FAIL'
(p/'quality').mkdir(exist_ok=True)
(p/'quality/source-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(checks,indent=2));sys.exit(0 if passed else 1)
