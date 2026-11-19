"""Écrit public/data/zones.json à partir de plans/boxes.json et de calib.json (transformation plan en mètres -> pixels de l'image isométrique)."""
import json, numpy as np
M = np.array(json.load(open('calib.json'))['1']); B = json.load(open('plans/boxes.json')); DY = 18
f = lambda x, y: [round(float(v), 1) for v in (np.array([x, y, 1]) @ M) + [0, DY]]
out = {'kz': round(float(np.hypot(*M[0])), 2), 'hauteur': 1.2, 'etages': {}}
for k in '012':
    out['etages'][k] = {b['name']: [f(b['x0'], b['y0']), f(b['x1'], b['y0']), f(b['x1'], b['y1']), f(b['x0'], b['y1'])] for b in B[k]['boxes']}
out['noyau'] = f(28.5, 4)
out['dalle'] = [f(-.3, -.3), f(32.3, -.3), f(32.3, 21.3), f(-.3, 21.3)]
json.dump(out, open('public/data/zones.json', 'w'), separators=(',', ':'))
