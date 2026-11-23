#!/usr/bin/env python3
"""
把本地照片归档整理成网页可用的小图，输出到 site/private/photos/（不会进入 Git）。

使用 Pillow 解码并压缩照片，sips 只读取尺寸与方向信息。
请使用包含 Pillow 的 Python 运行；避免 sips 将部分 iPhone MPO/JPEG 转为纯黑。

做了什么：
  1. 读取「照片归档清单.csv」里「处理状态 = 按年月归档」的行；
  2. 照片长边缩到 1800px、JPEG 质量 82；聊天截图（PNG）宽度缩到 1080px 并转成 JPEG；
  3. 删除 EXIF / XMP 元数据（其中可能有 GPS 定位，会暴露住址）；
  4. 输出到 private/photos/<年>/<月>/<原文件名>.jpg，并生成 private/photo-index.json，
     记录每张图的日期、对应事件、网页路径和横竖方向，方便写 private/content.js 时直接引用。

用法（在 site/ 目录下）：
  python3 tools/prepare_photos.py                 # 默认读取 ../照片归档清单.csv，照片根目录为 ..
  python3 tools/prepare_photos.py --csv PATH --root PATH --force
"""
import argparse
import csv
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
try:
    from PIL import Image
except ImportError:
    sys.exit('缺少 Pillow，请运行：python3 -m pip install Pillow')

SITE = Path(__file__).resolve().parent.parent
OUT_DIR = SITE / 'private' / 'photos'


def sips_props(path):
    out = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'orientation', str(path)],
                         capture_output=True, text=True).stdout
    props = {}
    for line in out.splitlines()[1:]:
        if ':' in line:
            k, v = line.strip().split(':', 1)
            props[k.strip()] = v.strip()
    return props


ROTATE = {'3': 180, '6': 90, '8': 270}


def strip_metadata(jpeg_path):
    """删除 JPEG 中的 APP1（EXIF/XMP）与 APP13（IPTC）段。纯字节处理，不改变像素。"""
    data = jpeg_path.read_bytes()
    if data[:2] != b'\xff\xd8':
        return
    out = bytearray(b'\xff\xd8')
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            break
        marker = data[i + 1]
        if marker == 0xDA:  # 开始扫描：之后是图像数据，原样保留
            out += data[i:]
            break
        length = int.from_bytes(data[i + 2:i + 4], 'big')
        segment = data[i:i + 2 + length]
        if marker not in (0xE1, 0xED):
            out += segment
        i += 2 + length
    jpeg_path.write_bytes(bytes(out))


def convert(src, dst, is_screenshot, display_rotation=0):
    dst.parent.mkdir(parents=True, exist_ok=True)
    props = sips_props(src)
    with tempfile.TemporaryDirectory() as tmp:
        tmp_jpg = Path(tmp) / 'x.jpg'
        # 部分旧照片的像素本身横躺而没有 EXIF；保留人工核验过的显示修正。
        rot = (ROTATE.get(props.get('orientation', ''), 0) + display_rotation) % 360
        # sips 会把部分多图 MPO/JPEG 的缩略输出写成纯黑；明确解码主图。
        # rot 已合并原有方向规则与人工修正，不再额外做 exif_transpose。
        with Image.open(src) as source:
            source.seek(0)
            image = source.convert('RGB')
        if rot:
            image = image.rotate(-rot, expand=True)
        if is_screenshot and image.width > 1080:
            image = image.resize((1080, round(image.height * 1080 / image.width)), Image.Resampling.LANCZOS)
        elif not is_screenshot:
            image.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
        image.save(tmp_jpg, 'JPEG', quality=85 if is_screenshot else 82, optimize=True)
        strip_metadata(tmp_jpg)
        dst.write_bytes(tmp_jpg.read_bytes())
    p = sips_props(dst)
    w, h = int(p.get('pixelWidth', 0) or 0), int(p.get('pixelHeight', 0) or 0)
    return w, h


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--csv', default=str(SITE.parent / '照片归档清单.csv'))
    ap.add_argument('--root', default=str(SITE.parent), help='照片归档根目录（包含 2024/2025/2026 文件夹）')
    ap.add_argument('--force', action='store_true', help='已存在的输出也重新生成')
    args = ap.parse_args()

    root = Path(args.root)
    rows = list(csv.DictReader(open(args.csv, encoding='utf-8-sig')))
    index_path = SITE / 'private' / 'photo-index.json'
    previous = {p['source']: p for p in json.loads(index_path.read_text(encoding='utf-8'))} if index_path.exists() else {}
    index, missing = [], []
    for row in rows:
        if row.get('处理状态') != '按年月归档':
            continue
        archived = row['归档路径']
        rel = archived.split('爱情博物馆/', 1)[-1] if '爱情博物馆/' in archived else archived
        src = root / rel
        if not src.exists():
            missing.append(rel)
            continue
        is_shot = src.suffix.lower() == '.png'
        display_rotation = previous.get(rel, {}).get('displayRotation', 0)
        dst = OUT_DIR / Path(rel).with_suffix('.jpg')
        if args.force or not dst.exists():
            w, h = convert(src, dst, is_shot, display_rotation)
        else:
            p = sips_props(dst)
            w, h = int(p.get('pixelWidth', 0) or 0), int(p.get('pixelHeight', 0) or 0)
        index.append({
            'date': row['日期或日期范围'],
            'event': row['对应事件或内容'],
            'source': rel,
            'src': str(dst.relative_to(SITE)).replace(os.sep, '/'),
            'type': 'chat' if is_shot else 'photo',
            'orientation': 'portrait' if h > w else 'landscape',
            'note': row.get('备注', ''),
            **({'displayRotation': display_rotation} if display_rotation else {}),
        })
        print(f"✓ {rel} → {index[-1]['src']} ({w}×{h})")

    (SITE / 'private').mkdir(exist_ok=True)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"\n完成：{len(index)} 张，索引写入 private/photo-index.json")
    if missing:
        print(f"找不到 {len(missing)} 个文件：", *missing, sep='\n  ')


if __name__ == '__main__':
    if sys.platform != 'darwin':
        sys.exit('这个脚本使用 macOS 自带的 sips，请在 Mac 上运行。')
    main()
