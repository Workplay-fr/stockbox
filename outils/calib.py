import json, numpy as np
from PIL import Image
from scipy import ndimage
B=json.load(open('plans/boxes.json'))
def doorpt(b):
    cx=(b['x0']+b['x1'])/2; cy=(b['y0']+b['y1'])/2
    return {'S':(cx,b['y1']),'N':(cx,b['y0']),'W':(b['x0'],cy)}[b['door']]
def clusters(f):
    a=np.asarray(Image.open(f).convert('RGBA')).astype(int)
    r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
    m=(al>200)&(g>r+30)&(g>b+5)&(r<60)&(g<130)
    lab,n=ndimage.label(m, structure=np.ones((3,3)))
    out=[]
    for i,sl in enumerate(ndimage.find_objects(lab)):
        sz=(lab[sl]==i+1).sum()
        if sz<15: continue
        ys,xs=np.nonzero(lab[sl]==i+1)
        out.append((xs.mean()+sl[1].start, ys.mean()+sl[0].start, sz, sl[1].stop-sl[1].start, sl[0].stop-sl[0].start))
    return out
for k in '012':
    c=clusters(f'src/iso-{k}.png'); print(k,len(c), 'doors plan', len(B[k]['boxes']))
    print(sorted([(int(x),int(y),s,w,h) for x,y,s,w,h in c], key=lambda t:t[2])[-8:])

def fit(P,Q):
    A=np.c_[P,np.ones(len(P))]; M,res,_,_=np.linalg.lstsq(A,Q,rcond=None); return M
init=np.array([[60,568],[912,75],[618,925]],float)
Pi=np.array([[0,0],[32,0],[0,21]],float)
res={}
for k in '012':
    c=np.array([(x,y) for x,y,*_ in clusters(f'src/iso-{k}.png')])
    P=np.array([doorpt(b) for b in B[k]['boxes']])
    M=fit(Pi,init)
    for it in range(6):
        pr=np.c_[P,np.ones(len(P))]@M
        d=np.linalg.norm(pr[:,None,:]-c[None,:,:],axis=2); j=d.argmin(1); dm=d.min(1)
        ok=dm<np.percentile(dm,90)+ (40 if it<2 else 5)
        M=fit(P[ok],c[j[ok]])
    pr=np.c_[P,np.ones(len(P))]@M; d=np.linalg.norm(pr[:,None,:]-c[None,:,:],axis=2)
    dm=d.min(1); print(k,'erreur moyenne px',dm.mean().round(1),'max',dm.max().round(1), 'unicité', len(set(d.argmin(1))), len(P))
    res[k]=M.tolist()
    bad=[(B[k]['boxes'][i]['name'],round(dm[i],1)) for i in np.argsort(-dm)[:5]]; print(' pires',bad)
json.dump(res,open('calib.json','w'))
print(np.array(res['1']))
