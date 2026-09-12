import argparse
import os
import pathlib
import random
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(os.environ.get('DIMA_AI_STUDIO_ROOT', pathlib.Path(__file__).resolve().parents[1]))
WAN_DIR = ROOT / 'local-engine' / 'Wan2.1'
MODEL_DIR = ROOT / 'local-engine' / 'Wan2.1-T2V-1.3B'


def ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        found = shutil.which('ffmpeg')
        if found:
            return found
        raise RuntimeError('FFmpeg не знайдено. SETUP-WINDOWS.ps1 встановлює imageio-ffmpeg.')


def run_wan(prompt, size, output, seed):
    generate = WAN_DIR / 'generate.py'
    if not generate.exists():
        raise RuntimeError('Wan2.1 не встановлено. Запусти local-engine/SETUP-WINDOWS.ps1.')
    if not MODEL_DIR.exists():
        raise RuntimeError('Модель Wan2.1-T2V-1.3B не встановлена. Запусти local-engine/SETUP-WINDOWS.ps1.')

    cmd = [
        sys.executable, str(generate),
        '--task', 't2v-1.3B',
        '--size', size,
        '--ckpt_dir', str(MODEL_DIR),
        '--prompt', prompt,
        '--frame_num', '81',
        '--sample_steps', '30',
        '--sample_shift', '8',
        '--sample_guide_scale', '6',
        '--offload_model', 'True',
        '--t5_cpu',
        '--base_seed', str(seed),
        '--save_file', str(output),
    ]
    print('Dima AI Local:', ' '.join(cmd), flush=True)
    completed = subprocess.run(cmd, cwd=WAN_DIR, text=True)
    if completed.returncode != 0:
        raise RuntimeError(f'Wan2.1 завершився з кодом {completed.returncode}.')
    if not pathlib.Path(output).exists():
        raise RuntimeError('Wan2.1 не створив MP4.')


def concat_clips(clips, output):
    ffmpeg = ffmpeg_exe()
    with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8') as f:
        concat_file = f.name
        for clip in clips:
            p = pathlib.Path(clip).resolve().as_posix().replace("'", "'\\''")
            f.write(f"file '{p}'\n")
    try:
        cmd = [ffmpeg, '-y', '-f', 'concat', '-safe', '0', '-i', concat_file, '-c', 'copy', output]
        completed = subprocess.run(cmd, text=True)
        if completed.returncode != 0:
            raise RuntimeError('FFmpeg не зміг об’єднати сцени.')
    finally:
        try:
            os.remove(concat_file)
        except OSError:
            pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--prompt', required=True)
    ap.add_argument('--size', default='480*832')
    ap.add_argument('--seconds', type=int, choices=[5, 15, 30, 60], default=5)
    ap.add_argument('--output', required=True)
    args = ap.parse_args()

    output = pathlib.Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    work = pathlib.Path(tempfile.mkdtemp(prefix='dima-ai-', dir=str(output.parent)))
    clips = []
    try:
        count = args.seconds // 5
        for i in range(count):
            clip = work / f'scene_{i+1:02d}.mp4'
            scene_prompt = (
                f'{args.prompt}. Continuous cinematic shot, scene {i+1} of {count}, '
                'keep the main subject visually consistent, realistic motion, natural daylight, '
                'smooth camera movement, no cuts inside the generated shot, no text, no watermark.'
            )
            run_wan(scene_prompt, args.size, clip, random.randint(1, 2_000_000_000))
            clips.append(clip)
        if len(clips) == 1:
            shutil.copy2(clips[0], output)
        else:
            concat_clips(clips, str(output))
        print(f'DONE {output}', flush=True)
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
