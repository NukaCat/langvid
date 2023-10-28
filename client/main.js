
async function fetch_json(url) {
  const response = await fetch(url)
  if (!response.ok) {
    console.log('Response error', response)
  }
  return await response.json()
}



class SubPanel {
  constructor(sub_panel_element) {
    this.element = sub_panel_element
    this.on_sub_clicked = (sub_idx) => {}
  }

  update_subtitles(subs) {
    console.log('update subs', subs)
    if (subs == null) {
      subs = []
    }
    
    const sub_panel_el = document.getElementById('sub_panel')
    sub_panel_el.innerHTML = ""
    
    for(let sub_idx = 0; sub_idx < subs.length; sub_idx++) {
      const sub_box_el = document.createElement('div')
      sub_box_el.className = 'sub_box'

      const sub_button_el = document.createElement('div')
      sub_button_el.onclick = () =>  { 
        this.set_cur_sub_idx(sub_idx)
        this.on_sub_clicked(sub_idx)
      }
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
    const sub_boxes = this.element.querySelectorAll('.sub_box')
    for(var i = 0; i < sub_boxes.length; i++) { 
      sub_boxes[i].className = `sub_box ${ i == sub_idx ? 'sub_box_selected': ''}`
    }
    sub_boxes[sub_idx].scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
  }

  set_height(height) {
    this.element.style.maxHeight = `${height}px`
  }
}


class VideoPlayer {
  constructor(video_element) {
    this.element = video_element
    this.on_video_update = () => {}
    this.element.ontimeupdate = () => { this.on_video_update()}
  }

  get time_ms() {
    return Math.round(this.element.currentTime * 1000)
  }

  set time_ms(time_ms) {
    this.element.currentTime = time_ms / 1000.0
  }

  set_video(video_url) {
    const video_source_el = this.element.querySelector('#video_source')
    video_source_el.src = video_url
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
    this.on_video_click = (video_id) => {}
  }
  
  update_video_list(video_list) {
    console.log(video_list)
    for(let idx = 0; idx < video_list.length; idx++) {
      const video = video_list[idx]

      const video_box_el = document.createElement('div')
      video_box_el.className = 'video_box'
      video_box_el.onclick = () => this.on_video_click(video.video_id)
      
      const thumbnail_el = document.createElement('img')
      thumbnail_el.src = video.thumbnail_url
      thumbnail_el.className = 'thumbnail'

      const video_name_el = document.createElement('div')
      video_name_el.innerText = video.episode
      video_name_el.className = 'video_name'

      video_box_el.appendChild(thumbnail_el)
      video_box_el.appendChild(video_name_el)

      this.element.appendChild(video_box_el)
    }
  }
}


async function main() {
  let videos = await fetch_json('data/auto/video_info.json')
  let subtitles = await fetch_json('data/auto/subtitles.json')
  let cur_subs = null

  const video_width = 1366
  const video_height = 768

  const sub_panel = new SubPanel(document.getElementById('sub_panel'))
  const video_player = new VideoPlayer(document.getElementById('video'))
  const title_selector = new TitleSelector(document.getElementById('title_selector'))
  
  video_player.set_size(video_width, video_height)
  sub_panel.set_height(video_height)

  title_selector.update_video_list(videos)
  
  video_player.on_video_update = function() {
    if(cur_subs == null) {
      return
    }
    const cur_time = video_player.time_ms

    for(var i = 0; i < cur_subs.length; i++) {
      if(cur_subs[i].start < cur_time && cur_subs[i].end > cur_time) {
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

  title_selector.on_video_click = (video_id) => {
    cur_subs = subtitles.filter((sub) => (sub.video_id == video_id))
    const video = videos.find((video) => video.video_id == video_id)

    video_player.set_video(video.video_url)
    video_player.play()

    sub_panel.update_subtitles(cur_subs)
  }
}

window.onload = main
