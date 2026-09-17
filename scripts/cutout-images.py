"""Détourage des photos principales du catalogue.

Chaque photo fournisseur arrive avec son propre fond (blanc, gris, studio bleuté, décor,
photo portée). Ce script retire le fond, recadre l'objet à une échelle commune et écrit :

  public/media/cut/<id>-480.webp et -960.webp   (fond transparent)
  lib/data/cutouts.json                          (mode, teinte, luminance par référence)

Deux modes, détectés automatiquement :
  pose   l'objet est entier dans le cadre : il est posé sur le sol de la scène, avec son ombre.
  cadre  le sujet touche un bord (photo portée, plan serré) : il reste ancré à ce bord, sans sol.

Usage :
  python scripts/cutout-images.py --ids mat-blade-gold bs-2000706
  python scripts/cutout-images.py --pilot          (échantillon de toutes les familles)
  python scripts/cutout-images.py --all
  python scripts/cutout-images.py --sheet out.png  (planche de contrôle des références traitées)

Dépendances locales : rembg (modèle u2net déjà en cache), Pillow, numpy. Rien n'est téléchargé.
"""
import argparse
import json
import os
import sys
import time

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT_DIR = os.path.join(ROOT, 'public', 'media', 'cut')
MANIFEST = os.path.join(ROOT, 'lib', 'data', 'cutouts.json')
CHECKPOINT = os.path.join(ROOT, '.research', 'cutouts-checkpoint.json')
SIZES = (960, 480)
BOX = 0.80  # part du carré occupée par l'objet posé
FLOOR = 0.90  # ligne de sol, en fraction de la hauteur


def catalogue():
    """Références et photo principale, lues dans les fichiers du dépôt (pas de base requise)."""
    items = {}
    data_dir = os.path.join(ROOT, 'lib', 'data')
    for name in os.listdir(data_dir):
        if not name.endswith('.json'):
            continue
        try:
            raw = json.load(open(os.path.join(data_dir, name), encoding='utf-8'))
        except Exception:
            continue
        rows = raw if isinstance(raw, list) else raw.get('products') if isinstance(raw, dict) else None
        if not isinstance(rows, list):
            continue
        for p in rows:
            if isinstance(p, dict) and p.get('id') and isinstance(p.get('images'), list) and p['images']:
                src = p['images'][0].get('src')
                if isinstance(src, str) and src.startswith('/'):
                    items.setdefault(p['id'], {'src': src, 'category': p.get('category', '')})
    return items


def clean_alpha(alpha: np.ndarray) -> np.ndarray:
    """Retire les liserés de cadre et adoucit le bord d'un pixel."""
    a = alpha.copy()
    h, w = a.shape
    # Un liseré : une ligne ou une colonne de bord presque pleine alors que la suivante est vide.
    for _ in range(3):
        if a[0].mean() > 200 and a[min(6, h - 1)].mean() < 60:
            a[:4] = 0
        if a[-1].mean() > 200 and a[max(h - 7, 0)].mean() < 60:
            a[-4:] = 0
        if a[:, 0].mean() > 200 and a[:, min(6, w - 1)].mean() < 60:
            a[:, :4] = 0
        if a[:, -1].mean() > 200 and a[:, max(w - 7, 0)].mean() < 60:
            a[:, -4:] = 0
    # Courbe de niveaux : le voile laissé par le fond d'origine tombe à zéro, le plein devient plein.
    # Invisible sur une tuile claire, ce voile dessine un rectangle sur la scène sombre.
    a = np.clip((a.astype(np.float32) - 30.0) * (255.0 / (232.0 - 30.0)), 0, 255).astype(np.uint8)
    img = Image.fromarray(a).filter(ImageFilter.GaussianBlur(0.6))
    return np.asarray(img)


def kept_share(rgb: np.ndarray, alpha: np.ndarray):
    """Part du produit visible que la découpe a gardée, quand le fond d'origine est uni.

    Sur un fond uni, tout pixel qui s'écarte de la couleur du fond appartient au produit. Si la découpe
    en garde nettement moins (objet fin : élastique, chaîne, pied de potence), elle est écartée et la
    photo d'origine sert. Sur un décor, pas d'estimation possible : None.
    """
    border = np.concatenate([rgb[:6].reshape(-1, 3), rgb[-6:].reshape(-1, 3), rgb[:, :6].reshape(-1, 3), rgb[:, -6:].reshape(-1, 3)]).astype(np.float32)
    if border.std(axis=0).max() > 9:
        return None
    bg = np.median(border, axis=0)
    visible = np.abs(rgb.astype(np.float32) - bg).max(axis=2) > 30
    if visible.sum() < 600:
        return None
    return float(((alpha > 128) & visible).sum() / visible.sum())


def prune(alpha: np.ndarray, cadre: bool) -> np.ndarray:
    """Retire les fragments : une main coupée par le cadre, une poussière, un bout de décor.

    Objet posé : on garde tout ce qui pèse au moins 1,5 % du plus grand morceau (une paire de gants,
    un porte-clés du lot restent). Photo portée : un morceau secondaire collé à un bord du cadre est
    toujours un reste du modèle (l'autre main, une épaule) ; il part s'il pèse moins du quart du sujet.
    """
    import cv2

    n, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 60).astype(np.uint8), connectivity=8)
    if n <= 2:
        return alpha
    h, w = alpha.shape
    areas = stats[1:, cv2.CC_STAT_AREA]
    main = int(areas.max())
    keep = np.zeros(n, dtype=bool)
    for i in range(1, n):
        area = int(stats[i, cv2.CC_STAT_AREA])
        x, y, bw, bh = (int(stats[i, k]) for k in (cv2.CC_STAT_LEFT, cv2.CC_STAT_TOP, cv2.CC_STAT_WIDTH, cv2.CC_STAT_HEIGHT))
        on_edge = x <= 2 or y <= 2 or x + bw >= w - 2 or y + bh >= h - 2
        if area == main:
            keep[i] = True
        elif cadre and on_edge:
            keep[i] = area >= 0.25 * main
        else:
            keep[i] = area >= 0.015 * main
    mask = keep[labels]
    # On élargit un peu le masque des morceaux gardés pour ne pas rogner leur bord adouci.
    mask = cv2.dilate(mask.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    out = alpha.copy()
    out[~mask] = 0
    return out


def analyse(rgba: Image.Image):
    arr = np.asarray(rgba)
    alpha = arr[..., 3]
    solid = alpha > 128
    if solid.sum() < 400:
        return None
    h, w = alpha.shape
    ys, xs = np.where(alpha > 24)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    edge = 3
    # Un bord est « touché » si une part notable du sujet s'y appuie.
    touch = {
        'top': (alpha[:edge] > 128).mean() > 0.06,
        'bottom': (alpha[-edge:] > 128).mean() > 0.06,
        'left': (alpha[:, :edge] > 128).mean() > 0.06,
        'right': (alpha[:, -edge:] > 128).mean() > 0.06,
    }
    rgb = arr[..., :3][solid].astype(np.float32)
    lum = float((0.2126 * rgb[:, 0] + 0.7152 * rgb[:, 1] + 0.0722 * rgb[:, 2]).mean() / 255)
    # Teinte : la couleur la plus saturée et présente, adoucie ensuite côté CSS.
    mx, mn = rgb.max(axis=1), rgb.min(axis=1)
    sat = (mx - mn) / np.maximum(mx, 1)
    vivid = rgb[(sat > 0.35) & (mx > 60)]
    tint = vivid.mean(axis=0) if len(vivid) > len(rgb) * 0.04 else rgb.mean(axis=0)
    return {
        'bbox': (int(x0), int(y0), int(x1) + 1, int(y1) + 1),
        'touch': [k for k, v in touch.items() if v],
        'lum': round(lum, 3),
        'tint': '#%02x%02x%02x' % tuple(int(c) for c in tint),
        'vivid': bool(len(vivid) > len(rgb) * 0.04),
        'coverage': float(solid.mean()),
    }


def compose(rgba: Image.Image, info, size: int) -> Image.Image:
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    if info['touch']:
        # Sujet cadré : on garde le cadrage d'origine, agrandi au carré, calé sur le bord touché.
        w, h = rgba.size
        scale = size / max(w, h)
        img = rgba.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        x = 0 if 'left' in info['touch'] and 'right' not in info['touch'] else size - img.width if 'right' in info['touch'] and 'left' not in info['touch'] else (size - img.width) // 2
        y = size - img.height if 'bottom' in info['touch'] else 0 if 'top' in info['touch'] else (size - img.height) // 2
        canvas.alpha_composite(img, (x, y))
        return canvas
    cut = rgba.crop(info['bbox'])
    box = size * BOX
    scale = min(box / cut.width, box / cut.height)
    img = cut.resize((max(1, round(cut.width * scale)), max(1, round(cut.height * scale))), Image.LANCZOS)
    x = (size - img.width) // 2
    y = round(size * FLOOR) - img.height
    canvas.alpha_composite(img, (x, max(0, y)))
    return canvas


def process(pid, item, session, remove):
    path = os.path.join(ROOT, 'public' + item['src'])
    if not os.path.isfile(path):
        return None, 'fichier absent'
    im = Image.open(path).convert('RGB')
    out = remove(im, session=session, post_process_mask=True)
    arr = np.asarray(out).copy()
    arr[..., 3] = clean_alpha(arr[..., 3])
    first = analyse(Image.fromarray(arr))
    if not first:
        return None, 'sujet introuvable'
    arr[..., 3] = prune(arr[..., 3], cadre=bool(first['touch']))
    share = kept_share(np.asarray(im), arr[..., 3])
    if share is not None and share < 0.62:
        return None, f'découpe incomplète ({share:.0%} du produit gardé)'
    rgba = Image.fromarray(arr)
    info = analyse(rgba)
    if not info:
        return None, 'sujet introuvable'
    if info['coverage'] > 0.93:
        return None, 'fond non séparé'
    # Une seule passe pour les prochains lancements : découpe, bord net, ombre d'appui des objets posés.
    big = defringe(compose(rgba, info, SIZES[0]))
    if not info['touch']:
        big = grounded(big)
    for size in SIZES:
        img = big if size == SIZES[0] else big.resize((size, size), Image.LANCZOS)
        img.save(os.path.join(OUT_DIR, f'{pid}-{size}.webp'), 'WEBP', quality=84, method=4)
    return {
        'mode': 'cadre' if info['touch'] else 'pose',
        'edges': info['touch'],
        'tint': info['tint'],
        'vivid': info['vivid'],
        'lum': info['lum'],
        'src': item['src'],
        'shadow': not info['touch'],
        'finished': True,
    }, None


def defringe(canvas: Image.Image) -> Image.Image:
    """Retire le liseré clair du fond d'origine : le bord recule d'un pixel, puis s'adoucit.

    Sur une scène teintée ou sombre, le reste de blanc du studio dessine un halo autour de l'objet.
    """
    r, g, b, a = canvas.split()
    a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    return Image.merge('RGBA', (r, g, b, a))


def grounded(canvas: Image.Image) -> Image.Image:
    """Ombre d'appui cuite dans l'image : la silhouette écrasée sous l'objet, floue, plus un noyau serré.

    Cuite plutôt que calculée en CSS : aucun filtre à l'exécution, la même ombre sur la carte, la fiche
    et la vignette sociale. Noire et semi-transparente, elle tient sur n'importe quelle teinte de scène.
    """
    size = canvas.width
    alpha = canvas.getchannel('A')
    box = alpha.point(lambda a: 255 if a > 24 else 0).getbbox()
    if not box:
        return canvas
    x0, y0, x1, y1 = box
    sil = alpha.crop(box)
    shadow = Image.new('L', (size, size), 0)
    for squash, blur, strength in ((0.11, 0.024, 0.34), (0.045, 0.008, 0.30)):
        h = max(6, round((y1 - y0) * squash))
        flat = sil.resize((x1 - x0, h), Image.LANCZOS).point(lambda a, s=strength: int(a * s))
        layer = Image.new('L', (size, size), 0)
        layer.paste(flat, (x0, min(size - h, y1 - h // 2)))
        layer = layer.filter(ImageFilter.GaussianBlur(size * blur))
        shadow = Image.fromarray(np.maximum(np.asarray(shadow), np.asarray(layer)))
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(Image.new('RGBA', (size, size), (22, 26, 18, 255)), (0, 0), shadow)
    out.alpha_composite(canvas)
    return out


def finish(manifest, items):
    """Deuxième passe, sans nouveau détourage : l'ombre d'appui des objets posés, et la photo d'origine de chaque découpe."""
    done = 0
    for pid, meta in manifest.items():
        if pid in items:
            meta['src'] = items[pid]['src']
        if meta.get('finished'):
            continue
        big = os.path.join(OUT_DIR, f'{pid}-960.webp')
        if not os.path.isfile(big):
            continue
        base = defringe(Image.open(big).convert('RGBA'))
        if meta['mode'] == 'pose':
            base = grounded(base)
            meta['shadow'] = True
        base.save(big, 'WEBP', quality=84, method=4)
        base.resize((480, 480), Image.LANCZOS).save(os.path.join(OUT_DIR, f'{pid}-480.webp'), 'WEBP', quality=84, method=4)
        meta['finished'] = True
        done += 1
        if done % 100 == 0:
            print(f'{done} finitions…', flush=True)
    return done


def pilot(items):
    """Un échantillon de chaque famille : les références maison, puis les premières de chaque famille."""
    chosen = [i for i in items if i.startswith(('mat-', 'bench-'))]
    per = {}
    for pid, it in items.items():
        if pid in chosen:
            continue
        per.setdefault(it['category'], [])
        if len(per[it['category']]) < (30 if it['category'] == 'gants-de-boxe' else 8):
            per[it['category']].append(pid)
    for ids in per.values():
        chosen += ids
    return chosen


def sheet(path, manifest):
    ids = sorted(manifest)[:96]
    T, cols = 200, 12
    rows = (len(ids) + cols - 1) // cols
    sh = Image.new('RGB', (cols * T, rows * T), (226, 228, 218))
    for n, pid in enumerate(ids):
        f = os.path.join(OUT_DIR, f'{pid}-480.webp')
        if not os.path.isfile(f):
            continue
        im = Image.open(f).convert('RGBA').resize((T, T), Image.LANCZOS)
        tile = Image.new('RGBA', (T, T), (226, 228, 218, 255) if manifest[pid]['mode'] == 'pose' else (208, 212, 200, 255))
        tile.alpha_composite(im)
        sh.paste(tile.convert('RGB'), ((n % cols) * T, (n // cols) * T))
    sh.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', nargs='*')
    ap.add_argument('--pilot', action='store_true')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--sheet')
    ap.add_argument('--threads', type=int, default=4, help='fils de calcul du détourage (4 par défaut : la machine reste utilisable)')
    ap.add_argument('--finish', action='store_true', help="ombres d'appui et photo d'origine, sans nouveau détourage")
    args = ap.parse_args()
    manifest = json.load(open(MANIFEST, encoding='utf-8')) if os.path.isfile(MANIFEST) else {}
    if os.path.isfile(CHECKPOINT) and not args.force:
        # Reprise d'un lot interrompu : le point de reprise complète le manifeste.
        manifest = {**manifest, **json.load(open(CHECKPOINT, encoding='utf-8'))}
    if args.finish:
        n = finish(manifest, catalogue())
        json.dump(dict(sorted(manifest.items())), open(MANIFEST, 'w', encoding='utf-8', newline=chr(10)), ensure_ascii=False, indent=1)
        print(json.dumps({'ombres': n, 'manifest': len(manifest)}))
        if args.sheet:
            sheet(args.sheet, manifest)
        return
    if args.sheet and not (args.ids or args.pilot or args.all):
        sheet(args.sheet, manifest)
        return
    items = catalogue()
    ids = args.ids or (pilot(items) if args.pilot else list(items) if args.all else [])
    if not ids:
        ap.print_help()
        return
    # Un lot de mille images ne doit pas affamer la machine : quatre fils, priorité basse. Sans cela,
    # le serveur de développement répond en six secondes pendant que le lot tourne.
    os.environ.setdefault('OMP_NUM_THREADS', str(args.threads))
    try:
        import psutil

        psutil.Process().nice(psutil.BELOW_NORMAL_PRIORITY_CLASS if os.name == 'nt' else 10)
    except Exception:
        pass
    import onnxruntime as ort
    from rembg import new_session, remove

    os.makedirs(OUT_DIR, exist_ok=True)
    options = ort.SessionOptions()
    options.intra_op_num_threads = args.threads
    options.inter_op_num_threads = 1
    session = new_session('u2net', sess_opts=options)
    done = skipped = 0
    problems = []
    t0 = time.time()
    for pid in ids:
        if pid not in items:
            problems.append((pid, 'référence inconnue'))
            continue
        if pid in manifest and not args.force and os.path.isfile(os.path.join(OUT_DIR, f'{pid}-480.webp')):
            skipped += 1
            continue
        meta, why = process(pid, items[pid], session, remove)
        if meta:
            manifest[pid] = meta
            done += 1
        else:
            manifest.pop(pid, None)
            for size in SIZES:
                stale = os.path.join(OUT_DIR, f'{pid}-{size}.webp')
                if os.path.isfile(stale):
                    os.remove(stale)
            problems.append((pid, why))
        if done and done % 50 == 0:
            # Point de reprise hors de l'arbre surveillé par le serveur de dev : réécrire le manifeste
            # toutes les minutes le faisait recompiler tout le site en boucle.
            json.dump(dict(sorted(manifest.items())), open(CHECKPOINT, 'w', encoding='utf-8', newline=chr(10)), ensure_ascii=False)
            print(f'{done} détourées…', flush=True)
    json.dump(dict(sorted(manifest.items())), open(MANIFEST, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
    modes = {}
    for m in manifest.values():
        modes[m['mode']] = modes.get(m['mode'], 0) + 1
    print(json.dumps({'traitees': done, 'deja_faites': skipped, 'ecartees': problems, 'manifest': len(manifest), 'modes': modes, 'secondes': round(time.time() - t0)}, ensure_ascii=False))
    if args.sheet:
        sheet(args.sheet, manifest)


if __name__ == '__main__':
    sys.exit(main())
