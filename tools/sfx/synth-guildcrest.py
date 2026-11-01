#!/usr/bin/env python3
"""Synthesizes Guildcrest's two new one-shots, deterministically (no samples, no service):

  abbey_bell  a large bronze bell struck three times (the Seal, docs/specs/ISLAND-04-guildcrest.md §4.5)
  book_close  a heavy book closing on a desk (the Pattern Book's case, §5.4)

Writes 48 kHz mono WAVs to tools/.cache/sfx/; tools/sfx/synth-guildcrest.sh encodes them like the others.
    python3 tools/sfx/synth-guildcrest.py
"""
import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), '..', '.cache', 'sfx')
rng = np.random.default_rng(404)


def write(name, x):
    os.makedirs(OUT, exist_ok=True)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
    with wave.open(os.path.join(OUT, f'{name}.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())


def bell_strike(t, prime=196.0):
    # A minor-third church bell: hum, prime, tierce, quint, nominal and the upper partials, each with its
    # own decay; each partial is a slightly detuned pair, so it beats slowly as a real bell does.
    partials = [  # (ratio, amplitude, decay seconds)
        (0.5, 0.55, 5.5), (1.0, 0.70, 4.0), (1.183, 0.45, 3.0), (1.506, 0.25, 2.2),
        (2.0, 0.60, 2.6), (2.514, 0.22, 1.4), (2.662, 0.18, 1.2), (3.011, 0.20, 1.0),
        (4.166, 0.10, 0.6), (5.433, 0.06, 0.4),
    ]
    x = np.zeros_like(t)
    for ratio, amp, decay in partials:
        f = prime * ratio
        env = np.exp(-t / decay)
        x += amp * env * (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * (f + 0.35 * ratio) * t + 1.3))
    # The clapper's hit: a short bright noise burst.
    hit = rng.standard_normal(len(t)) * np.exp(-t / 0.012) * 0.35
    return x + hit


def abbey_bell():
    dur = 7.5
    t = np.arange(int(SR * dur)) / SR
    x = np.zeros_like(t)
    for start, gain in ((0.0, 1.0), (2.1, 0.92), (4.2, 0.96)):
        i = int(start * SR)
        x[i:] += gain * bell_strike(t[: len(t) - i])
    # A short stone-tower reflection, and a gentle fade at the end.
    d = int(0.083 * SR)
    x[d:] += 0.22 * x[:-d]
    fade = int(0.6 * SR)
    x[-fade:] *= np.linspace(1, 0, fade)
    return x


def book_close():
    dur = 0.9
    t = np.arange(int(SR * dur)) / SR
    # The pages riffling shut (high, papery), then the cover's thud (low, damped).
    riffle_t = t[: int(0.11 * SR)]
    riffle = rng.standard_normal(len(riffle_t)) * np.sin(np.pi * riffle_t / riffle_t[-1]) ** 2 * 0.25
    riffle = np.convolve(riffle, [1, -0.85], mode='same')
    x = np.zeros_like(t)
    x[: len(riffle)] += riffle
    k = int(0.10 * SR)
    tt = t[: len(t) - k]
    thud = np.sin(2 * np.pi * 92 * tt) * np.exp(-tt / 0.07) + 0.5 * np.sin(2 * np.pi * 148 * tt) * np.exp(-tt / 0.04)
    body = rng.standard_normal(len(tt)) * np.exp(-tt / 0.018)
    body = np.convolve(body, np.ones(24) / 24, mode='same') * 2.2
    x[k:] += thud + body
    fade = int(0.1 * SR)
    x[-fade:] *= np.linspace(1, 0, fade)
    return x


if __name__ == '__main__':
    write('abbey_bell', abbey_bell())
    write('book_close', book_close())
    print('wrote', OUT)
