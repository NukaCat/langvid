from flask import Flask, send_from_directory
import pysrt
import json
import os
import ffmpeg
import urllib3

DATA_PATH = ''
DATA_AUTO_PATH = ''

def path_to_url(path):
    url = os.path.relpath(path, DATA_PATH)
    url = url.replace('\\', '/')
    return '/data/' + url

class VideoInfo:
    id: str
    path: str
    subtitles_path: str
    tumbnail_path: str
    title: str
    episode: str
    
def collect_videos() -> list[VideoInfo]:
    video_list = []
    for root, dirs, files in os.walk(DATA_PATH):
        root_rel_path = os.path.relpath(root, DATA_PATH)
        for file in files:
            name, ext = os.path.splitext(file)
            if ext != '.mp4':
                continue
            video = VideoInfo()
            video.path=os.path.join(root, name+".mp4")
            video.subtitles_path=os.path.join(root, name + ".srt")
            video.tumbnail_path=os.path.join(DATA_PATH, 'auto', root_rel_path, name+'.png')
            video.id = root_rel_path + '/' + name
            video.title = root_rel_path or name
            video.episode = name
            video_list.append(video)
    return video_list


def generate_thumbnails(video_list: list[VideoInfo]):
    for video in video_list:
        if os.path.isfile(video.tumbnail_path):
            continue
        os.makedirs(os.path.dirname(video.tumbnail_path), exist_ok=True)
        (
        ffmpeg
            .input(video.path, ss=20)
            .filter('scale', 200, -1)
            .output(video.tumbnail_path, vframes=1)
            .run()
        )
        
def generate_subtitles_json(path: str, video_list: list[VideoInfo]):
    subs_data = []
    for video in video_list:
        if not os.path.isfile(video.subtitles_path):
            print(f"can't find {video.subtitles_path}")
            continue

        subs = pysrt.open(video.subtitles_path)
        for sub in subs:
            subs_data.append({
                'text': sub.text,
                'start': sub.start.ordinal,
                'end': sub.end.ordinal,
                'index': sub.index,
                'video_id': video.id
            })
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(subs_data, f, ensure_ascii=False, indent=2)


def generate_video_info_json(path: str, video_list: list[VideoInfo]):
    video_data = []
    for video in video_list:
        video_data.append({
            'title': video.title,
            'episode': video.episode,
            'video_id': video.id,
            'video_url': path_to_url(video.path),
            'thumbnail_url': path_to_url(video.tumbnail_path)
            })

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(video_data, f, ensure_ascii=False, indent=2)


app = Flask('LangVid', static_url_path='', static_folder='client')

@app.route('/data/<path:path>')
def data(path):
    return send_from_directory(DATA_PATH, path=path)

@app.route('/')
def root():
    return send_from_directory('client', 'index.html')


def generate_wanikani_json(path, token, level):
    headers = {
        "Wanikani-Revision": "20170710",
        "Authorization": "Bearer " + token,
    }

    http = urllib3.PoolManager()
    levels_str = ",".join([str(num) for num in range(1, level + 1)])
    url = f"https://api.wanikani.com/v2/subjects/?levels={levels_str}"
    data = []
    while url:
        resp = http.request("GET", url, headers=headers)
        resp_json = json.loads(resp.data)
        data.extend(resp_json['data'])
        url = resp_json.get('next_url')
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    params_path = 'server_params.json'
    if not os.path.isfile(params_path):
        print(f"can't find {params_path}")
        exit(-1)

    with open(params_path) as f:
        params = json.load(f)
        
    if 'data_dir' not in params or params['data_dir'] == '':
        print(f'data dir not specified')
        exit(-1)
    
    DATA_PATH = params['data_dir']
    DATA_AUTO_PATH = os.path.join(DATA_PATH, 'auto')
    os.makedirs(DATA_AUTO_PATH, exist_ok=True)
    
    wanikani_file_path = os.path.join(DATA_AUTO_PATH, 'wanikani.json')
    if 'wanikani' in params and not os.path.exists(wanikani_file_path):
        if 'token' not in params['wanikani']:
            print('wanikani token is not specified in params')
            exit(-1)
        if 'level' not in params['wanikani']:
            print('wanikani level is not specified in params')
            exit(-1)
            
        generate_wanikani_json(wanikani_file_path, params['wanikani']['token'], int(params['wanikani']['level']))
    
    video_list = collect_videos()
    generate_thumbnails(video_list)
    generate_subtitles_json(os.path.join(DATA_AUTO_PATH, 'subtitles.json'), video_list)
    generate_video_info_json(os.path.join(DATA_AUTO_PATH, 'video_info.json'), video_list)

    app.run()

