
function fetch_subs_for_video(title, video_name) {
  return fetch(`api/sub/${title}/${video_name}`).then((response) => {
      if(!response.ok) {
        console.log('Response error', response)
      }
      return response.json()
  })
}


function fetch_video_list() {
  return fetch('api/video_list').then((response) => {
      if(!response.ok) {
        console.log('Response error', response)
      }
      return response.json()
  })
}


class SubPanel {
  constructor(sub_panel_element) {
    this.element = sub_panel_element
    this.on_sub_clicked = (sub_idx) => {}
  }

  set_subs(subs) {
    if (subs == null) {
      subs = []
    }
    
    const sub_panel_el = document.getElementById('sub_panel')
    sub_panel_el.innerHTML = ""
    
    for(let sub_idx = 0; sub_idx < subs.length; sub_idx++) {
      const sub_box_el = document.createElement('div')
      sub_box_el.className = 'sub_box'

      const sub_button_el = document.createElement('div')
      sub_button_el.onclick = () =>  { this.on_sub_clicked(sub_idx) }
      sub_button_el.className = 'sub_button'

      const sub_text_el = document.createElement('div')
      sub_text_el.className = 'sub_text'
      sub_text_el.innerText = subs[sub_idx].text

      sub_box_el.appendChild(sub_button_el)
      sub_box_el.appendChild(sub_text_el)
      sub_panel_el.appendChild(sub_box_el)
    }
  }
  
  set_cur_sub_idx(sub_idx) {
    const sub_boxes = this.element.querySelector('sub_box')
    for(var i = 0; i < sub_boxes.length; i++) { 
      sub_boxes[i].className = `sub_box ${ i == sub_idx ? 'sub_box_selected': ''}`
    }
  }

  set_height(height) {
    this.element.style.maxHeight = `${height}px`
  }
}


class VideoPlayer {
  constructor(video_element) {
    this.element = video_element
    this.on_video_update = () => {}
    this.element.onTimeUpdate = () => this.on_video_update()
  }

  get time_ms() {
    return Math.round(this.element.currentTime * 1000)
  }

  set time_ms(time_ms) {
    this.element.currentTime = time_ms / 1000.0
  }

  set_video(title, video_name) {
    const video_source_el = this.element.querySelector('#video_source')
    video_source_el.src = `api/video/${title}/${video_name}`
    video_source_el.type = 'video/mp4'
    this.element.load()
  }
  
  set_size(width, height) {
    this.element.width = width
    this.element.height = height
  }
  
  play() {
    this.element.play()
  }
}


class TitleSelector {
  constructor(element) {
    this.element = element
    this.on_video_click = (title, video_name) => {}
  }
  
  request_title_list_update() {
    fetch_video_list().then((video_list) => {
      for(let idx = 0; idx < video_list.length; idx++) {
        const title = video_list[idx].title
        const video_name = video_list[idx].video_name

        const title_el = document.createElement('div')
        title_el.className = 'title'
        title_el.innerText = video_name
        title_el.onclick = () => this.on_video_click(title, video_name)
        this.element.appendChild(title_el)
      }
    })
  }
}


function main() {
  let cur_subs = null

  const video_width = 1366
  const video_height = 768

  const sub_panel = new SubPanel(document.getElementById('sub_panel'))
  const video_player = new VideoPlayer(document.getElementById('video'))
  const title_selector = new TitleSelector(document.getElementById('title_selector'))
  
  video_player.set_size(video_width, video_height)
  
  sub_panel.set_height(video_height)

  
  video_player.on_video_update = function(e) {
    if(cur_subs == null) {
      return
    }
    const cur_time = video_player.time_ms()

    for(var i = 0; i < subs.length; i++) {
      if(subs[i].start < cur_time && subs[i].end > cur_time) {
        sub_panel.set_cur_sub_idx(i)
      }
    }
  }
  
  sub_panel.on_sub_clicked = (sub_idx) => {
    if(cur_subs == null) {
      return
    }
    video_player.time_ms = cur_subs[sub_idx].start
    video_player.play()
  }

  title_selector.on_video_click = (title, video_name) => {
    video_player.set_video(title, video_name)

    fetch_subs_for_video(title, video_name).then((subs) => {
      cur_subs = subs
      sub_panel.set_subs(subs)
    })
  }

  title_selector.request_title_list_update()
}

window.onload = main
