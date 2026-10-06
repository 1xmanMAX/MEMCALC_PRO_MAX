import struct, io
from PIL import Image, ImageDraw
def draw(sz):
    S=sz*4; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    m=S*0.06; d.rounded_rectangle([m,m,S-m,S-m],radius=S*0.2,fill=(11,92,173,255))
    w=max(2,int(S*0.065))
    # pórtico / edificio
    d.line([(S*.25,S*.70),(S*.75,S*.70)],fill='white',width=w)
    d.line([(S*.31,S*.70),(S*.31,S*.40),(S*.5,S*.27),(S*.69,S*.40),(S*.69,S*.70)],fill='white',width=w,joint='curve')
    d.line([(S*.42,S*.70),(S*.42,S*.53),(S*.58,S*.53),(S*.58,S*.70)],fill=(124,192,255,255),width=w)
    return im.resize((sz,sz),Image.LANCZOS)
sizes=[16,24,32,48,64,128,256]
pngs=[]
for s in sizes:
    b=io.BytesIO(); draw(s).save(b,'PNG'); pngs.append(b.getvalue())
# .ico también (para accesos directos)
ico=struct.pack('<HHH',0,1,len(sizes)); off=6+16*len(sizes); body=b''
for s,p in zip(sizes,pngs):
    ico+=struct.pack('<BBBBHHII',s%256,s%256,0,0,1,32,len(p),off+len(body)); body+=p
open('icon.ico','wb').write(ico+body); draw(256).save('icon.png')
# ---- COFF .syso con RT_ICON + RT_GROUP_ICON ----
grp=struct.pack('<HHH',0,1,len(sizes))
for i,(s,p) in enumerate(zip(sizes,pngs)):
    grp+=struct.pack('<BBBBHHIH',s%256,s%256,0,0,1,32,len(p),i+1)
def dirhdr(nid): return struct.pack('<IIHHHH',0,0,0,0,0,nid)
# layout
n=len(sizes)
root_off=0; root_sz=16+8*2
icon_dir=root_off+root_sz; icon_dir_sz=16+8*n
grp_dir=icon_dir+icon_dir_sz; grp_dir_sz=16+8
lang_dirs=grp_dir+grp_dir_sz; lang_sz=16+8
icon_lang=[lang_dirs+i*lang_sz for i in range(n)]; grp_lang=lang_dirs+n*lang_sz
data_entries=grp_lang+lang_sz; de_sz=16
icon_de=[data_entries+i*de_sz for i in range(n)]; grp_de=data_entries+n*de_sz
data_start=grp_de+de_sz
blobs=pngs+[grp]; offs=[]; cur=data_start
for b in blobs:
    cur=(cur+7)&~7; offs.append(cur); cur+=len(b)
total=cur
buf=bytearray(total); relocs=[]
def put(o,b): buf[o:o+len(b)]=b
put(root_off,dirhdr(2)+struct.pack('<II',3,0x80000000|icon_dir)+struct.pack('<II',14,0x80000000|grp_dir))
put(icon_dir,dirhdr(n)+b''.join(struct.pack('<II',i+1,0x80000000|icon_lang[i]) for i in range(n)))
put(grp_dir,dirhdr(1)+struct.pack('<II',1,0x80000000|grp_lang))
for i in range(n): put(icon_lang[i],dirhdr(1)+struct.pack('<II',0x0409,icon_de[i]))
put(grp_lang,dirhdr(1)+struct.pack('<II',0x0409,grp_de))
for i in range(n):
    put(icon_de[i],struct.pack('<IIII',offs[i],len(pngs[i]),0,0)); relocs.append(icon_de[i])
put(grp_de,struct.pack('<IIII',offs[n],len(grp),0,0)); relocs.append(grp_de)
for o,b in zip(offs,blobs): put(o,b)
raw=bytes(buf)
hdr_sz=20; sec_sz=40
raw_ptr=hdr_sz+sec_sz; rel_ptr=raw_ptr+len(raw); sym_ptr=rel_ptr+10*len(relocs)
coff=struct.pack('<HHIIIHH',0x8664,1,0,sym_ptr,1,0,0)
sec=struct.pack('<8sIIIIIIHHI',b'.rsrc',0,0,len(raw),raw_ptr,rel_ptr,0,len(relocs),0,0x40000040)
rel=b''.join(struct.pack('<IIH',r,0,3) for r in relocs)
sym=struct.pack('<8sIhHBB',b'.rsrc',0,1,0,3,0)
strtab=struct.pack('<I',4)
open('rsrc_windows_amd64.syso','wb').write(coff+sec+raw+rel+sym+strtab)
print('ok',len(raw))
