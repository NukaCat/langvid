from flask import Flask, send_from_directory, send_file
import pysrt
import json
import os
import sys
import ffmpeg

DATA_PATH = ''

app = Flask('LangVid', static_url_path='', static_folder='client')

@app.route('/')
def root():
    return send_from_directory('client', 'index.html')

@app.route('/api/video/<path:path>')
def data(path):
    if len(path.split('/')) != 2:
        return app.response_class(status=400)

    title, video_name = path.split('/')
    video_path = title + '/' + video_name + ".mp4"

    return send_from_directory(DATA_PATH, video_path)


@app.route('/api/video_list')
def get_titles():
    videos = []

    for dir_entry in os.listdir(DATA_PATH):
        path = os.path.join(DATA_PATH, dir_entry)
        if os.path.isfile(path):
            name, ext = os.path.splitext(dir_entry)
            if ext == '.mp4':
                videos.append({
                    "title": dir_entry,
                    "video_name": name
                })

        if os.path.isdir(path):
            for sub_dir_entry in os.listdir(path):
                name, ext = os.path.splitext(sub_dir_entry)
                if ext == '.mp4':
                    videos.append({
                        "title": dir_entry,
                        "video_name": name,
                    })

    return app.response_class(
        response=json.dumps(videos),
        status=200,
        mimetype='application/json'
    )
            

@app.route('/api/sub/<path:path>')
def get_sub(path):
    if len(path.split('/')) != 2:
        return app.response_class(status=400)

    title, video_name = path.split('/')

    path = os.path.join(DATA_PATH, title, video_name) + ".srt"
    if not os.path.isfile(path):
        print(f'Cant find {path}')
        return app.response_class(status=404)

    subs = pysrt.open(path)
    subs_data = []
    for sub in subs:
        subs_data.append({
            'text': sub.text,
            'start': sub.start.ordinal,
            'end': sub.end.ordinal,
            'index': sub.index,
        })

    return app.response_class(
        response=json.dumps(subs_data),
        status=200,
        mimetype='application/json'
    )

def generate_thumbnail(video_path, thumbnail_path):
    (
    ffmpeg
        .input(video_path, ss=20)
        .filter('scale', 200, -1)
        .output(thumbnail_path, vframes=1)
        .run()
    )
    
@app.route('/api/thumbnail/<path:path>')
def get_thumbnail(path):
    if len(path.split('/')) != 2:
        return app.response_class(status=400)

    title, video_name = path.split('/')

    video_path = os.path.join(DATA_PATH, title, video_name) + '.mp4'
    thumbnail_path = os.path.join(DATA_PATH, title, video_name) + '.png'

    if os.path.isfile(thumbnail_path):
        return send_file(thumbnail_path)
    
    generate_thumbnail(video_path, thumbnail_path)
    return send_file(thumbnail_path)
    

if __name__ == '__main__':
    if len(sys.argv) != 3 or sys.argv[1] != '--data':
        print('expected --data argument')
        exit(-1)
    DATA_PATH = sys.argv[2]
    app.run(debug=True)