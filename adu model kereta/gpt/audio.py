#!/usr/bin/env python3
"""Original 15-second stereo score and foley, synthesized with Python stdlib.

No audio assets, samples, packages, or network access. Fixed xorshift noise.
The stereo PCM WAV has exactly 720,000 samples at 48 kHz.
"""
from array import array
from math import sin, cos, pi, exp, tanh, sqrt
from pathlib import Path
import argparse
import json
import sys
import wave

SR = 48_000
DURATION = 15
N = SR * DURATION
TAU = 2 * pi
LEFT, RIGHT = array('d', [0.0]) * N, array('d', [0.0]) * N


def clamp(x, lo=0.0, hi=1.0):
    return min(hi, max(lo, x))


def smooth(x):
    x = clamp(x)
    return x*x*(3-2*x)


def frequency(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def note(start, length, midi, gain=.1, pan=0, voice='bell'):
    """Soft struck sine/triangle harmonics, or a slow detuned sustained pad."""
    a, b = max(0, round(start*SR)), min(N, round((start+length)*SR))
    hz = frequency(midi)
    gl, gr = sqrt((1-pan)/2), sqrt((1+pan)/2)
    for i in range(a, b):
        t = i/SR-start
        release = smooth((length-t)/(.7 if voice == 'pad' else .22))
        if voice == 'pad':
            env = smooth(t/.7)*release
            v = (sin(TAU*hz*t)+.28*sin(TAU*hz*1.003*t)+.12*sin(TAU*hz*2*t))/1.4
        else:
            env = (1-exp(-t*90))*exp(-t/(1.0 if voice=='bell' else 1.5))*release
            v = (sin(TAU*hz*t)+.22*sin(TAU*hz*2*t)*exp(-t*3)+.08*sin(TAU*hz*3*t))/1.3
        v *= gain*env
        LEFT[i] += v*gl
        RIGHT[i] += v*gr


def compose():
    # C minor(add9) -> Abmaj7 -> Fmaj7 -> Gsus -> Cmaj9.
    # The E natural at dawn resolves the minor opening into a warm major ending.
    chords = [
        (0, 4.5, [48,55,60,63,67], .039),
        (3.8, 4.5, [44,51,55,60,63], .038),
        (7.8, 2.8, [41,53,57,60,64], .040),
        (9.9, 2.8, [43,55,60,62,67], .036),
        (11.8, 3.2, [48,55,60,64,71], .044),
    ]
    for start, length, chord, gain in chords:
        for j, pitch in enumerate(chord):
            note(start,length,pitch,gain,(j-2)*.18,'pad')
    melody=[(0.35,67),(1.15,75),(2.05,74),(3.0,72),
            (4.4,70),(5.15,68),(6.05,67),(7.0,63),
            (8.3,69),(9.05,72),(9.8,76),(10.55,79),
            (11.3,76),(12.1,74),(12.8,72),(13.55,79)]
    for j,(start,pitch) in enumerate(melody):
        note(start, min(2.4,15-start), pitch,.092 if start<8 else .103, .14*sin(j*.8))
        # A quiet discrete stereo echo, fully synthesized from the same notes.
        note(start+.28,min(1.8,15-start-.28),pitch,.017,-.26)
    for base,chord in [(0,[48,55,60,63]),(4,[44,51,55,60]),
                       (8,[41,53,57,60]),(10,[43,55,59,62]),(12,[48,55,60,64])]:
        for j in range(6 if base<8 else 3):
            note(base+.2+j*.65,1.9,chord[j%4]+12,.034, -.3 if j%2 else .3)


def foley():
    seed=0x714bc23
    low_l=low_r=rumble=0.0
    for i in range(N):
        t=i/SR
        seed ^= (seed << 13) & 0xffffffff
        seed ^= seed >> 17
        seed ^= (seed << 5) & 0xffffffff
        seed &= 0xffffffff
        noise=seed/2147483648-1
        # Decorrelation with the upper and lower parts of the same seeded stream.
        noise_r=((seed*1664525+1013904223)&0xffffffff)/2147483648-1
        low_l += .08*(noise-low_l)
        low_r += .08*(noise_r-low_r)
        rumble += .005*(noise-rumble)
        cabin=smooth((t-3.8)/.4)*(1-smooth((t-7.8)/.4))
        rain=(1-smooth((t-8.2)/3.3))*(1-.46*cabin)
        rain_l=(noise*.018+low_l*.09)*rain
        rain_r=(noise_r*.018+low_r*.09)*rain
        q=clamp((t-12)/2)
        speed=(1-q)**2
        # Integrated squared speed. After 14 s, the train really is stationary.
        travel=t if t<12 else 12+2*(q-q*q+q*q*q/3)
        railphase=(travel*3.15)%1
        pulse=exp(-railphase*31)+.56*exp(-((railphase-.15)%1)*43)
        clack=pulse*(.047*noise+.038*sin(TAU*143*t))*speed*(1-.25*cabin)
        drive=(.063*rumble+.015*sin(TAU*48*t)+.008*sin(TAU*73*t))*speed
        chuff=(.5+.5*sin(TAU*travel*2.1))**6*low_l*.08*speed
        # Small distant thunder synchronized after the one tiny lightning bolt.
        thunder=.22*rumble*exp(-(t-1.94)*4) if 1.94<t<2.8 else 0
        brake=0.0
        if 12.85<t<14.05:
            v=(t-12.85)/1.2
            brake=sin(pi*v)*(.011*sin(TAU*(730*t-16*t*t))+.034*low_r)
        steam=0.0
        if 13.05<t<14.55:
            v=t-13.05
            steam=(1-exp(-v*16))*exp(-v*2.7)*(.038*noise+.095*low_l)
        LEFT[i]+=rain_l+drive+clack+chuff+thunder+brake*.85+steam*.9
        RIGHT[i]+=rain_r+drive+clack*.8+chuff*.85+thunder+brake+steam
    # One gentle final arrival chime, rather than a harsh UI sound.
    note(14.12,.88,84,.027,.25)


def save(path):
    # Tiny stereo feedback delays produce a room impression without external DSP.
    for delay, gain in [(int(SR*.113),.07),(int(SR*.179),.045)]:
        for i in range(delay,N):
            LEFT[i]+=RIGHT[i-delay]*gain
            RIGHT[i]+=LEFT[i-delay]*gain
    peak=max(max(abs(v) for v in LEFT),max(abs(v) for v in RIGHT))
    # Moderate headroom. No clipping and no hard audio edge at either end.
    scale=.83/max(peak,1e-9)
    pcm=array('h')
    energy=0.0
    for i in range(N):
        t=i/SR
        fade=smooth(t/.06)*smooth((DURATION-t)/.32)
        l=int(clamp(LEFT[i]*scale*fade,-1,1)*32767)
        r=int(clamp(RIGHT[i]*scale*fade,-1,1)*32767)
        pcm.extend([l,r])
        energy+=(l/32768)**2+(r/32768)**2
    if sys.byteorder!='little':
        pcm.byteswap()
    path.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(path),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    report={'sample_rate':SR,'channels':2,'samples_per_channel':N,'duration':N/SR,
            'peak_pcm':max(abs(v) for v in pcm),'rms':sqrt(energy/(N*2)),
            'seed':'0x714bc23','external_audio_assets':0}
    path.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report))


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',type=Path,default=Path('output/soundtrack.wav'))
    args=parser.parse_args()
    compose();foley();save(args.output)
