const max_playlist_length = 8;

class Player {
  constructor() {
    this.audio = document.getElementsByTagName('audio')[0];
    this.audio.volume = 0.5;
    this.audio.addEventListener('ended', () => this.change_track(+1));
    this.playlist = [];
    this.play_next_music = true;
    this.config = 'sane';

    navigator.mediaSession.setActionHandler('previoustrack', () => this.change_track(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => this.change_track(+1));

    this.sheet = new Sheet();
    //this.audio.addEventListener('timeupdate', () => this.sheet.set_time(this.audio.currentTime));  // This is too irregular
    this.update_time();
    document.body.classList.add('loading');
  }

  set_config(config) {
    this.audio.pause();
    this.clear_playlist();
    this.config = config;
    this.play_next_music = true;
    document.body.classList.add('loading');
  }

  async change_track(offset) {
    const current_music_index = this.playlist.findIndex(m => m == this.current_music);
    const new_music_index = Math.max(current_music_index + offset, 0);
    if(current_music_index >= 0 && new_music_index < this.playlist.length) {
      this.play_music(this.playlist[new_music_index]);
    } else {
      this.play_next_music = true;
      document.body.classList.add('loading');
    }
  }

  clear_playlist() {
    for(let music of this.playlist) {
      this.delete_music(music);
    }
    this.playlist = [];
  }

  async download_current_music() {
    const link = document.createElement("a");
    link.href = this.current_music.sequence;
    link.download = `${this.current_music.name}.mid`;
    link.click();
  }

  async update_playlist() {
    if(this.playlist.length == 0 || this.playlist[this.playlist.length-1] == this.current_music) {
      const music_config = this.config;
      const steve_gen = await api(`/steve/generate?configuration=${music_config}`, {
        method: 'POST'
      });

      const robin_render = await api(`/robin/render?filename=${steve_gen.sequence}`, {
        method: 'POST'
      });

      const new_music = {
        config: music_config,
        name: steve_gen.sequence.split('/').pop().split('.')[0],
      };

      new_music.sequence = URL.createObjectURL(await (await fetch(api_filepath(steve_gen.sequence))).blob());
      new_music.audio = URL.createObjectURL(await (await fetch(api_filepath(robin_render.audio))).blob());
      new_music.description = await (await fetch(api_filepath(steve_gen.description))).json();
      new_music.object_urls = [new_music.sequence, new_music.audio];

      // Check config is still wanted
      if(this.config == music_config) {
        this.playlist.push(new_music);
      }

      while(this.playlist.length > max_playlist_length && this.current_music != this.playlist[0]) {
        this.delete_music(this.playlist.shift());
      }
    }
    if(this.playlist.length > 0 && this.play_next_music) {
      await this.play_music(this.playlist[this.playlist.length-1]);
    }
    setTimeout(() => this.update_playlist(), 1000);
  }

  update_time() {
    const wait = this.sheet.set_time(this.audio.currentTime);
    setTimeout(() => this.update_time(), wait * 1000);
  }

  async play_music(music) {
    this.current_music = music;
    this.audio.src = this.current_music.audio;
    this.audio.play();
    this.play_next_music = false;
    const new_music_desc = this.current_music.description;
    const new_music_title = `${new_music_desc.scale.name} ${new_music_desc.tempo}bpm ${new_music_desc.signature.beats_per_bar}/${new_music_desc.signature.beat_value}`;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: new_music_title,
      artist: "Steve & Robin",
      album: this.config,
      artwork: [
        {
          src: location.origin+"/src/img/icon.png",
          sizes: "48x48",
          type: "image/png",
        },
      ],
    });
    document.title = new_music_title;
    await this.sheet.set_music(this.current_music);
    document.body.classList.remove('loading');
  }
  delete_music(music) {
    for(let url of music.object_urls) {
      URL.revokeObjectURL(url);
    }
  }
}
