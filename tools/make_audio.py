"""서재 효과음 합성 스크립트 (numpy + ffmpeg).

- fireplace.mp3   : 30초 이음매 없는 벽난로 소리 (낮은 불꽃 울림 + 쉭쉭 소리 + 탁탁 튀는 소리)
- page-flip-1~3.mp3 : 책장 넘기는 소리
- winter-library-bgm-loop.mp3 : AI 배경음악의 끝과 처음을 교차 페이드해 자연스럽게 반복되도록 가공

사용: python3 tools/make_audio.py  (프로젝트 루트에서)
"""
import subprocess
import numpy as np

SR = 44100
OUT = 'public/audio'
rng = np.random.default_rng(7)


def shaped_noise(n, mag_fn, channels=2):
    """FFT 영역에서 스펙트럼을 깎아 만든 노이즈. 결과가 주기적이라 그대로 반복해도 이음매가 없다."""
    freqs = np.fft.rfftfreq(n, 1 / SR)
    mag = mag_fn(np.maximum(freqs, 1.0))
    out = []
    for _ in range(channels):
        spec = (rng.standard_normal(len(freqs)) + 1j * rng.standard_normal(len(freqs))) * mag
        x = np.fft.irfft(spec, n)
        out.append(x / (np.abs(x).max() + 1e-9))
    return np.stack(out, 1)


def periodic_lfo(n, cycles_list, amps):
    t = np.arange(n) / n
    v = np.zeros(n)
    for c, a in zip(cycles_list, amps):
        v += a * np.sin(2 * np.pi * (c * t + rng.random()))
    return v


def burst(length, center, q, decay):
    """짧은 '탁' 소리: 대역 통과된 노이즈 + 지수 감쇠"""
    m = max(8, int(length))
    x = rng.standard_normal(m)
    f = np.fft.rfftfreq(m, 1 / SR)
    spec = np.fft.rfft(x) * np.exp(-0.5 * ((f - center) / (center / q)) ** 2)
    y = np.fft.irfft(spec, m)
    env = np.exp(-np.arange(m) / (decay * SR))
    env[: min(6, m)] *= np.linspace(0, 1, min(6, m))
    y = y * env
    return y / (np.abs(y).max() + 1e-9)


def write(name, data, bitrate='128k'):
    data = np.clip(data, -1, 1)
    pcm = (data * 32767).astype('<i2').tobytes()
    ch = data.shape[1] if data.ndim == 2 else 1
    subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', str(ch), '-i', '-',
         '-c:a', 'libmp3lame', '-b:a', bitrate, f'{OUT}/{name}'],
        input=pcm, check=True)


def fireplace(seconds=30):
    n = SR * seconds
    # 1) 낮게 웅웅대는 불꽃 (갈색 노이즈 → 저역 통과)
    rumble = shaped_noise(n, lambda f: (1 / f) * np.exp(-f / 160))
    breath = 0.75 + 0.25 * periodic_lfo(n, [3, 7, 13], [0.6, 0.3, 0.2])
    rumble *= breath[:, None] * 0.32
    # 2) 가스가 새는 듯한 부드러운 쉭 소리
    hiss = shaped_noise(n, lambda f: np.exp(-0.5 * ((np.log(f) - np.log(3500)) / 0.6) ** 2))
    hiss *= (0.5 + 0.5 * periodic_lfo(n, [5, 11, 17], [0.5, 0.3, 0.2]))[:, None] * 0.018
    out = rumble + hiss
    # 3) 탁탁 튀는 소리 (군집 포아송 과정)
    t = 0.0
    while t < seconds:
        t += rng.exponential(0.11)
        cluster = rng.integers(1, 5) if rng.random() < 0.35 else 1
        tt = t
        for _ in range(cluster):
            tt += rng.exponential(0.018)
            big = rng.random() < 0.06
            if big:  # 장작이 갈라지는 '딱'
                b = burst(SR * 0.06, rng.uniform(500, 1400), 1.2, rng.uniform(0.008, 0.02)) * rng.uniform(0.6, 1.0)
            else:
                b = burst(SR * rng.uniform(0.002, 0.012), rng.uniform(1500, 7000), rng.uniform(0.8, 2.5),
                          rng.uniform(0.0008, 0.003)) * min(1.0, rng.pareto(2.0) * 0.18 + 0.08)
            pan = rng.uniform(0.25, 0.75)
            start = int(tt * SR) % n
            idx = (start + np.arange(len(b))) % n  # 끝을 넘어가면 처음으로 → 이음매 없음
            out[idx, 0] += b * (1 - pan) * 1.4
            out[idx, 1] += b * pan * 1.4
    out /= np.abs(out).max()
    # 큰 '딱' 소리만 살짝 눌러 전체 음량을 고르게 (소프트 리미터)
    out = np.tanh(out * 3.0) / np.tanh(3.0)
    write('fireplace.mp3', out * 0.8)


def page_flip(i, seconds=0.45):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # 시간에 따라 위로 쓸려 올라가는 대역 (종이가 공기를 가르는 소리)
    f = np.fft.rfftfreq(n, 1 / SR)
    frames = []
    hop = 512
    win = np.hanning(1024)
    y = np.zeros(n + 1024)
    for k, s in enumerate(range(0, n, hop)):
        seg = np.zeros(1024)
        part = noise[s:s + 1024]
        seg[: len(part)] = part
        seg *= win
        pos = s / n
        center = 900 + 4200 * pos ** 0.7 + rng.uniform(-200, 200)
        ff = np.fft.rfftfreq(1024, 1 / SR)
        spec = np.fft.rfft(seg) * (np.exp(-0.5 * ((ff - center) / (center * 0.9)) ** 2) + 0.15 * (ff > 4000))
        y[s:s + 1024] += np.fft.irfft(spec, 1024)
    y = y[:n]
    rise = 0.08 + 0.03 * i
    env = np.where(t < rise, (t / rise) ** 1.5, np.exp(-(t - rise) / (0.07 + 0.02 * i)))
    # 종이 결이 바스락거리는 잔떨림
    grain = 1 + 0.5 * (rng.random(n) < 0.02) * rng.random(n)
    y = y * env * grain
    # 마지막에 종이가 내려앉는 '툭'
    land_at = int(SR * (0.2 + 0.03 * i))
    thump = burst(SR * 0.05, 220, 0.8, 0.012) * 0.35
    y[land_at:land_at + len(thump)] += thump[: max(0, n - land_at)]
    y /= np.abs(y).max()
    stereo = np.stack([y * 0.9, y * 0.75], 1) * 0.8
    write(f'page-flip-{i}.mp3', stereo, '96k')


def bgm_loop(src='tools/source/winter-library-bgm.mp3', fade=4.0):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, '<i2').reshape(-1, 2).astype(np.float32) / 32768
    f = int(fade * SR)
    head, body = a[:f], a[f:].copy()
    ramp = np.linspace(0, 1, f)[:, None]
    # 끝 4초를 시작 4초와 등전력 교차 → 반복 지점이 자연스럽게 이어짐
    body[-f:] = body[-f:] * np.cos(ramp * np.pi / 2) + head * np.sin(ramp * np.pi / 2)
    write('winter-library-bgm-loop.mp3', body, '128k')


if __name__ == '__main__':
    fireplace()
    for i in (1, 2, 3):
        page_flip(i)
    bgm_loop()
    print('done')
