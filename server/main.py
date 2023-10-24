from flask import Flask, send_from_directory
import pysrt
import json
import os
import sys

DATA_PATH = ''

app = Flask('LangVid', static_url_path='', static_folder='client')

@app.route('/data/<path:path>')
def data(path):
    return send_from_directory(DATA_PATH, path)


@app.route('/')
def root():
    return send_from_directory('client', 'index.html')

@app.route('/api/get_sub/<path:path>')
def get_sub(path):
    path = os.path.join(DATA_PATH, path)
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

    response = app.response_class(
        response=json.dumps(subs_data),
        status=200,
        mimetype='application/json'
    )
    return response
    

if __name__ == '__main__':
    if len(sys.argv) != 3 or sys.argv[1] != '--data':
        print('expected --data argument')
        exit(-1)
    DATA_PATH = sys.argv[2]
    app.run(debug=True)