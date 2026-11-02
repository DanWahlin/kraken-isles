#!/usr/bin/env python3
"""Guildcrest layout numbers (docs/specs/ISLAND-04-guildcrest.md §3).

Prints every world position, heading and leg length from the island-frame (u, v) values in the
spec, and writes top-down-layout.svg beside this file. No AI art: a hand-made diagram from numbers.

Frame: centre C = (5900, 250). u runs along bearing 143 deg (from the loch mouth inland), v along
bearing 53 deg. World (x east, z south) = C + u*U + v*V.
"""
import math
import os

C = (5900.0, 250.0)
U = (math.sin(math.radians(143)), -math.cos(math.radians(143)))  # (0.6018, 0.7986)
V = (math.sin(math.radians(53)), -math.cos(math.radians(53)))    # (0.7986, -0.6018)


def world(u, v):
    return (C[0] + u * U[0] + v * V[0], C[1] + u * U[1] + v * V[1])


def heading(a, b):
    """The game's heading from world a to world b (a heading h faces (sin h, cos h))."""
    return math.atan2(b[0] - a[0], b[1] - a[1])


# Anchors: name -> (u, v, y, look-at name or None)
A = {
    'berth': (-196, 8, 0.0, None),
    'landing': (-190, 16, 2.2, 'lyra'),
    'moira': (-212, 24, 2.4, 'landing'),
    'lyra': (-166, 36, 3.0, 'landing'),
    'charterStone': (-96, 46, 10.0, None),
    'elspeth': (-102, 40, 10.0, 'charterStone'),
    'braeFoot': (-74, 60, 10.0, None),
    'braeTurn': (-48, 80, 22.0, None),
    'aidan': (-18, 106, 34.0, 'braeTurn'),
    'brigid': (4, 112, 36.0, 'aidan'),
    'ewan': (22, 141, 36.0, 'brigid'),
    'eastGate': (42, 140, 36.0, None),
    'ridge': (66, 150, 39.0, None),
    'fergus': (90, 154, 42.0, 'ridge'),
    'rory': (96, 160, 42.0, 'fergus'),
    'towerStair': (82, 128, 40.0, None),
    'seren': (66, 116, 40.0, 'towerStair'),
    'towerTop': (56, 114, 76.0, None),
    # circuit stations, lap 1 (the cloister walk, clockwise from the scriptorium door)
    'pb.shelf': (8, 118, 36.0, None),
    'pb.spine': (8, 132, 36.0, None),
    'pb.desk': (18, 136, 36.0, None),
    'pb.proof': (32, 136, 36.0, None),
    'pb.bell': (32, 120, 36.0, None),
    'pb.lectern': (20, 116, 36.0, None),
    # circuit stations, lap 2 (the guildhall yard)
    'tb.indenture': (86, 158, 42.0, None),
    'tb.rack': (98, 166, 42.0, None),
    'tb.proof': (108, 160, 42.0, None),
    'tb.door': (104, 150, 42.0, None),
    'tb.roll': (94, 146, 42.0, None),
    'tb.bench': (84, 150, 42.0, None),
    'tb.testBench': (78, 156, 42.0, None),
    'mill1': (122, 190, 52.0, None),
    'mill2': (150, 214, 58.0, None),
    'mill3': (176, 172, 56.0, None),
    'benScrivener': (260, -60, 182.0, None),
    'linnLip': (-36, 78, 34.0, None),
    'linnPool': (-56, 70, 12.0, None),
    'lochan': (82, 58, 52.0, None),
    'mouth': (-430, -30, 0.0, None),
    'laneStart': (-560, -30, 0.0, None),
    'turning': (-300, -30, 0.0, None),
}

ROUTE = [
    'landing', 'lyra', 'elspeth', 'braeFoot', 'braeTurn', 'aidan', 'brigid', 'ewan', 'eastGate',
    'ridge', 'fergus', 'towerStair', 'seren',
]


def main():
    print('Anchors (x, y, z, heading to its look target):')
    for k, (u, v, y, look) in A.items():
        x, z = world(u, v)
        h = ''
        if look:
            lu, lv, _, _ = A[look]
            h = f'  h {heading((x, z), world(lu, lv)):+.2f}'
        print(f'  {k:14s} ({x:8.1f}, {y:5.1f}, {z:8.1f}){h}')
    print('\nRoute legs (3D, m):')
    total = 0.0
    for a, b in zip(ROUTE, ROUTE[1:]):
        (ua, va, ya, _), (ub, vb, yb, _) = A[a], A[b]
        pa, pb = world(ua, va), world(ub, vb)
        d = math.dist((pa[0], ya, pa[1]), (pb[0], yb, pb[1]))
        total += d
        print(f'  {a:10s} -> {b:10s} {d:6.1f}  total {total:6.1f}')
    # the berth's heading: bow to the mouth (bearing 323 deg)
    b = math.radians(323)
    print(f'\nberth heading (bow to bearing 323): {math.atan2(math.sin(b), -math.cos(b)):+.3f}')
    for name, (cx, cz) in {'keelhaven': (4000, -1650), 'thousand-bough': (2050, -1500)}.items():
        print(f'centre distance to {name}: {math.dist(C, (cx, cz)):.0f} m')
    write_svg()


def write_svg():
    s = 0.55  # px per m
    ox, oz = 4980, -560
    W, H = int(1800 * s), int(1700 * s)

    def p(u, v):
        x, z = world(u, v)
        return ((x - ox) * s, (z - oz) * s)

    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
           '<rect width="100%" height="100%" fill="#1B3A5C"/>']
    # coast: an oval in the frame, u -400..420, v -330..330, with the sea loch cut in from the west
    pts = []
    for i in range(72):
        a = i / 72 * 2 * math.pi
        u = 410 * math.cos(a) + 10
        v = 330 * math.sin(a)
        pts.append(p(u, v))
    out.append('<polygon fill="#6f8a64" stroke="#2b3a2a" points="' +
               ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts) + '"/>')
    loch = [p(-460, -70), p(-130, -50), p(-120, 10), p(-460, 20)]
    out.append('<polygon fill="#2FA39A" points="' + ' '.join(f'{x:.1f},{y:.1f}' for x, y in loch) + '"/>')
    route = [p(A[k][0], A[k][1]) for k in ROUTE]
    out.append('<polyline fill="none" stroke="#FFF1C8" stroke-width="2" points="' +
               ' '.join(f'{x:.1f},{y:.1f}' for x, y in route) + '"/>')
    for k, (u, v, _, _) in A.items():
        x, y = p(u, v)
        big = k in ('towerTop', 'benScrivener', 'mill1', 'mill2', 'mill3')
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{4 if big else 2}" fill="#{"D9452B" if big else "ffffff"}"/>')
        if '.' not in k:
            out.append(f'<text x="{x + 4:.1f}" y="{y - 3:.1f}" font-size="9" fill="#ffffff" font-family="sans-serif">{k}</text>')
    out.append('<text x="10" y="18" font-size="12" fill="#ffffff" font-family="sans-serif">'
               'Guildcrest top-down (north up, 0.55 px/m). draw.py, docs/specs/ISLAND-04-guildcrest.md</text>')
    out.append('</svg>')
    with open(os.path.join(os.path.dirname(__file__), 'top-down-layout.svg'), 'w') as f:
        f.write('\n'.join(out))


if __name__ == '__main__':
    main()
