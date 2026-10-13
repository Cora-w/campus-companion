"""Read-only APK inspection. Uses Python 3 standard library; no extraction needed."""
import hashlib
import json
import sys
import zipfile


def inspect(path):
    with zipfile.ZipFile(path) as archive:
        prefix = 'assets/web/'
        names = archive.namelist()
        scripts = '\n'.join(archive.read(n).decode('utf-8') for n in names
                            if n.startswith(prefix) and n.endswith('.js'))
        checks = {
            'official_map_file': prefix + 'maps/scavc-sanxingdui-2024.jpg' in names,
            'official_map_component': 'scavc-sanxingdui-2024.jpg' in scripts,
            'old_sample_map_absent': '样例校园地图，可选择楼栋' not in scripts,
            'campus_shops': all(name in scripts for name in ['蜜雪冰城（航院校内店）', '曹氏鸭脖', '熊麻婆现炒浇头面・饭', '广汉市李小胖餐饮店']),
        }
        info_path = prefix + 'build-info.json'
        info = json.loads(archive.read(info_path)) if info_path in names else None
        checks['build_info'] = bool(info and info.get('revision') and info.get('version'))
        integrity_path = prefix + 'asset-integrity.json'
        checks['asset_integrity'] = False
        if integrity_path in names:
            integrity = json.loads(archive.read(integrity_path))
            files = integrity.get('files', {})
            actual = {n[len(prefix):] for n in names if n.startswith(prefix)
                      and not n.endswith('/') and n != integrity_path}
            checks['asset_integrity'] = integrity.get('version') == 1 and bool(files) and set(files) == actual and all(
                hashlib.sha256(archive.read(prefix+n)).hexdigest() == digest for n, digest in files.items())
        print(json.dumps({'build': info, 'checks': checks}, ensure_ascii=False, indent=2))
        return all(checks.values())


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python Android/scripts/inspect-apk.py <apk>')
    try:
        sys.exit(0 if inspect(sys.argv[1]) else 1)
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        sys.exit('APK inspection failed: ' + str(error))
