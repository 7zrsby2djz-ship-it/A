#!/usr/bin/env python3
"""Optional maintainer task: fetch/licence-check the Commons originals once.

Normal builds use checked-in recordings and never require the network.
Requires Python 3, curl, ffmpeg and ffprobe. Source files remain unchanged; MP3 copies
only change format/channel count/loudness, preserving the full utterance.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'audio'
HEADERS = {'User-Agent': 'KanaRebuild/1.1 (educational app; attribution in repository)'}
KANA = json.loads((ROOT / 'data/kana-basic.v1.json').read_text())['kana']
IDS = [k['id'] for k in KANA if k['kind'] == 'basic']
SPECIAL = {'a':'Ja-A.oga', 'e':'Ja-E.oga', 'i':'Japanese I.ogg',
           'u':'Japanese U.ogg', 'o':'Japanese O.ogg', 'ka':'Ja-Ka.oga',
           'so':'Ja-So.oga', 'chi':'Japanese ti.ogg', 'fu':'Japanese hu.ogg'}
FILES = {k:SPECIAL.get(k, 'Japanese ' + k + '.ogg') for k in IDS}

def get(url):
    # curl also works in proxied environments; errors never create a fake recording.
    return subprocess.check_output(['curl', '--silent', '--show-error', '--fail',
                                    '--location', '--max-time', '45', '--retry', '4',
                                    '--retry-delay', '5', '--retry-max-time', '180',
                                    '--user-agent', HEADERS['User-Agent'], url])

params = {'action':'query', 'format':'json', 'prop':'imageinfo',
          'iiprop':'url|extmetadata|sha1', 'redirects':'1',
          'titles':'|'.join('File:' + f for f in FILES.values())}
AUDIO.mkdir(parents=True, exist_ok=True)
meta_path = AUDIO / 'source-metadata.json'
if meta_path.exists():
    metadata = json.loads(meta_path.read_text())
else:
    metadata = json.loads(get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)))
    meta_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
pages = {p['title']:p for p in metadata['query']['pages'].values()}
redirects = {r['from']:r['to'] for r in metadata['query'].get('redirects', [])}
normalized = {r['from']:r['to'] for r in metadata['query'].get('normalized', [])}

def resolve(title):
    title = normalized.get(title, title)
    return redirects.get(title, title)

def fetch_one(kana_id):
    title = resolve('File:' + FILES[kana_id])
    page = pages[title]
    assert 'imageinfo' in page, 'Missing source: ' + title
    info = page['imageinfo'][0]
    extra = info['extmetadata']
    val = lambda name: extra.get(name, {}).get('value', '')
    artist = re.sub('<[^>]+>', '', val('Artist'))
    assert val('LicenseShortName') == 'Public domain', 'Review licence: ' + title
    assert artist == 'Hakatanoshio117117', 'Review speaker: ' + title
    canonical_url = info['url'].split('?')[0]
    url = canonical_url
    ext = Path(urllib.parse.urlparse(url).path).suffix
    original = AUDIO / 'original' / (kana_id + ext)
    original.parent.mkdir(parents=True, exist_ok=True)
    if original.exists():
        raw = original.read_bytes()
        assert hashlib.sha1(raw).hexdigest() == info['sha1'], 'Source hash changed: ' + title
        source_format = 'Commons original Ogg'
    else:
        # Commons offers an official MP3 derivative of this very same recording.
        # Use that supported format for mobile rather than requesting the Ogg again.
        filename = Path(urllib.parse.urlparse(canonical_url).path).name
        url = canonical_url.replace('/wikipedia/commons/', '/wikipedia/commons/transcoded/') + '/' + filename + '.mp3'
        original = AUDIO / 'original' / (kana_id + '.mp3')
        if original.exists():
            raw = original.read_bytes()
        else:
            raw = get(url)
            original.write_bytes(raw)
            time.sleep(2)  # Respect Commons traffic limits; curl also honours Retry-After.
        source_format = 'Commons official MP3 derivative'
    mp3 = AUDIO / 'mp3' / (kana_id + '.mp3')
    mp3.parent.mkdir(parents=True, exist_ok=True)
    converted = subprocess.check_output(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(original),
                    '-af', 'loudnorm=I=-18:TP=-1.5:LRA=7', '-ac', '1', '-ar', '44100',
                    '-codec:a', 'libmp3lame', '-b:a', '64k', '-map_metadata', '-1',
                    '-fflags', '+bitexact', '-flags:a', '+bitexact', '-f', 'mp3', 'pipe:1'])
    assert len(converted) > 1000, 'Empty conversion: ' + title
    mp3.write_bytes(converted)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format',
                                               '-show_streams', '-of', 'json', str(mp3)]))
    duration = float(probe['format']['duration'])
    assert 0.2 < duration < 6, (title, duration)
    print('Downloaded and verified: ' + kana_id, flush=True)
    return {'kanaId':kana_id, 'sourceTitle':title, 'sourcePage':info['descriptionurl'],
            'sourceUrl':url, 'canonicalOriginalUrl':canonical_url, 'sourceFormat':source_format,
            'author':artist, 'license':'Public domain (PD-self)',
            'sourceDescription':re.sub('<[^>]+>', '', val('ImageDescription')),
            'commonsOriginalSha1':info['sha1'], 'sourceSha1':hashlib.sha1(raw).hexdigest(),
            'originalPath':str(original.relative_to(ROOT)),
            'mp3Path':str(mp3.relative_to(ROOT)), 'mp3Sha256':hashlib.sha256(mp3.read_bytes()).hexdigest(),
            'durationSeconds':duration,
            'changes':'Mono MP3, 44.1 kHz, 64 kbps; loudness normalized; full recording preserved.'}

clips = [fetch_one(k) for k in IDS]
manifest = {'schemaVersion':1, 'preparedOn':'2026-10-07', 'author':'Hakatanoshio117117',
            'collectionUrl':'https://commons.wikimedia.org/wiki/Category:Audio_files_of_hiragana_(set_by_Hakatanoshio117117)',
            'license':'Public domain (PD-self)', 'clips':clips,
            'usage':'44 basic sounds; hiragana and katakana share sounds. N/wo stay in full-word context.',
            'review':'Per-file description, artist, licence and source hash checked; native-device listening still required.'}
(AUDIO / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('PASS: 44 recordings with per-file source, licence and hashes.')
