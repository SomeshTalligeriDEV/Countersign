#!/usr/bin/env python3
"""Deterministic TikZ/SVG plots of existing call-region measurements; stdlib only."""
from pathlib import Path
import csv, hashlib, html, json
paper = Path(__file__).resolve().parent
source = paper.parent / 'results/gas.csv'
if not source.exists():
    source = paper / 'data/gas.csv'
rows = list(csv.DictReader(source.open()))
labels = {'A_direct_transfer':'Direct ERC20', 'B_erc20_allowance':'ERC20 allowance',
          'C_countersign_automatic':'Countersign automatic',
          'D_countersign_human_fixture':'Countersign human fixture'}
assert len(rows) == 4 and {r['configuration'] for r in rows} == set(labels)
assert all(r['environment'] == 'LOCAL_MOCK_TOKEN' and int(r['samples']) == 1 for r in rows)
values = [int(r['call_region_gas']) for r in rows]
assert all(0 < g < 300000 for g in values)
lines = [r'\begin{figure}[htbp]\centering',
         r'\begin{tikzpicture}[x=1cm,y=.8cm,font=\small]',
         r'\draw[->] (0,-3.6)--(7.6,-3.6);\node at (3.75,-4.7) {Call-region gas (gas units)};']
for tick in range(0,300001,50000):
    x = tick/40000
    lines += [f'\\draw[gray!25] ({x:.4f},-3.4)--({x:.4f},.4);',
              f'\\draw ({x:.4f},-3.6)--({x:.4f},-3.7) node[below,font=\\scriptsize] {{{tick:,}}};']
for i, row in enumerate(rows):
    g=values[i]; x=g/40000
    lines += [f'\\node[anchor=east,font=\\small] at (-.1,{-i}) {{{labels[row["configuration"]]}}};',
              f'\\fill[blue!55!black] (0,{-i-.23}) rectangle ({x:.4f},{-i+.23});',
              f'\\node[anchor=west,font=\\scriptsize] at ({x+.1:.4f},{-i}) {{{g:,}}};']
lines += [r'\end{tikzpicture}',
 r'\caption{Local mock-token call-region gas, $n=1$ per configuration. Generated from the recorded gas CSV and benchmark trace. Setup, intrinsic gas and off-chain authentication are excluded; access warmness is not normalized. No error bars or inferential statistics are warranted. Not public-testnet fees or latency.}\label{fig:gas}',r'\end{figure}']
(paper/'figures/gas.tex').write_text('\n'.join(lines)+'\n')
# Standalone vector counterpart for inspection and reuse; same source and units.
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="430" viewBox="0 0 1000 430">',
'<rect width="1000" height="430" fill="white"/>',
'<g font-family="sans-serif" fill="#182734">',
'<text x="30" y="32" font-size="21">Local mock-token execution-region gas</text>',
'<text x="30" y="58" font-size="14">One recorded sample per configuration; no statistical uncertainty estimate</text>']
for t in range(0,300001,50000):
    x=300+t/500
    svg += [f'<path d="M{x} 82V326" stroke="#d8dce0"/>', f'<text x="{x}" y="350" text-anchor="middle" font-size="13">{t:,}</text>']
for i,r in enumerate(rows):
    y=100+55*i; g=values[i]
    svg += [f'<text x="285" y="{y+19}" text-anchor="end" font-size="15">{html.escape(labels[r["configuration"]])}</text>',
    f'<rect x="300" y="{y}" width="{g/500}" height="28" fill="#28577b"/>',
    f'<text x="{308+g/500}" y="{y+19}" font-size="14">{g:,}</text>']
svg += ['<path d="M300 326H900" stroke="#182734"/>',
'<text x="600" y="382" text-anchor="middle" font-size="16">Call-region gas (gas units)</text>',
'<text x="30" y="413" font-size="12">Source: research/results/gas.csv; setup and intrinsic gas excluded; not public-chain fees.</text>', '</g></svg>']
(paper/'figures/gas.svg').write_text('\n'.join(svg)+'\n')
manifest={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'generator_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
 'raw_trace':'docs/proof/research/benchmark-forge.txt', 'values_gas':values,
 'samples_per_configuration':1,'environment':'LOCAL_MOCK_TOKEN',
 'outputs':{name:hashlib.sha256((paper/'figures'/name).read_bytes()).hexdigest() for name in ['gas.tex','gas.svg']}}
(paper/'figures/gas-provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
