"""Generate original 16-second demo and aligned Standard MIDI file using stdlib only."""
import math
from pathlib import Path
import struct
import wave
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)
SR=22050; TPQ=480; DURATION=16
melody=[74,77,81,79,77,74,72,69,74,77,81,84,81,79,77,74,76,79,83,81,79,76,74,71,76,79,83,86,83,81,79,76]
notes=[(i*.5,.43,p,0) for i,p in enumerate(melody)]
notes += [(i*2,1.8,48+(i%4)*2,1) for i in range(8)]
def vlq(v):
    a=[v&127];v>>=7
    while v:a.insert(0,(v&127)|128);v>>=7
    return bytes(a)
def block(tag,data):return tag+struct.pack(">I",len(data))+data
def track(events):
    data=bytearray();tick=0
    for t,event in sorted(events,key=lambda a:(a[0],a[1][0]==0x90)):
        data+=vlq(t-tick)+event;tick=t
    return block(b"MTrk",data+b"\x00\xff\x2f\x00")
ts=[track([(0,b"\xff\x51\x03\x07\xa1\x20")])]
for part in [0,1]:
    ev=[]
    for start,dur,p,kind in notes:
        if kind!=part:continue
        a=round(start*960);b=round((start+dur)*960)
        ev.extend([(a,bytes([0x90,p,76])),(b,bytes([0x80,p,0]))])
    ts.append(track(ev))
(OUT/"demo.mid").write_bytes(block(b"MThd",struct.pack(">HHH",1,len(ts),TPQ))+b"".join(ts))
data=[0.0]*(SR*DURATION)
for start,dur,p,kind in notes:
    f=440*2**((p-69)/12);begin=int(start*SR)
    for j in range(int(dur*SR)):
        i=begin+j
        if i>=len(data):break
        t=j/SR;fade=min(1,t*50,(dur-t)*12)
        data[i]+=(.15 if kind==0 else .22)*fade*(math.sin(2*math.pi*f*t)+.2*math.sin(4*math.pi*f*t))
with wave.open(str(OUT/"demo.wav"),"wb") as output:
    output.setnchannels(1);output.setsampwidth(2);output.setframerate(SR)
    output.writeframes(b"".join(struct.pack("<h",round(max(-1,min(1,s))*32767)) for s in data))
print("Generated demo.wav and demo.mid")
