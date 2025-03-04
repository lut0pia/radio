const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

class Sheet {
  constructor() {
    this.section_el = document.getElementById('sheet');
    this.scale_el = document.createElement('span');
    this.section_el.appendChild(this.scale_el);
    this.duration_el = document.createElement('span');
    this.section_el.appendChild(this.duration_el);
    this.tempo_el = document.createElement('span');
    this.section_el.appendChild(this.tempo_el);
    this.signature_el = document.createElement('span');
    this.section_el.appendChild(this.signature_el);

    this.wrapper_el = document.createElement('wrapper');
    this.table_el = document.createElement('table');
    this.wrapper_el.appendChild(this.table_el)
    this.section_el.appendChild(this.wrapper_el);

    this.beat_row = document.createElement('tr');
    this.beat_row.classList.add('beats')
    this.table_el.appendChild(this.beat_row);

    this.bar_row = document.createElement('tr');
    this.bar_row.classList.add('bars')
    this.table_el.appendChild(this.bar_row);

    this.chord_row = document.createElement('tr');
    this.chord_row.classList.add('chords')
    this.table_el.appendChild(this.chord_row);

    this.section_el.style.display = 'none';

    this.pattern_canvas = document.createElement('canvas');
  }

  async set_music(music) {
    const desc = music.description;
    this.music = music;
    this.desc = desc;
    this.scale_el.innerText = `Scale: ${notes[desc.scale.key]} ${desc.scale.name}`;
    const duration = Math.floor(desc.duration);
    this.duration_el.innerText = `Duration: ${Math.floor(duration/60)}:${String(duration%60).padStart(2, '0')}`;
    this.tempo_el.innerText = `BPM: ${desc.tempo}`;
    this.signature_el.innerText = `Signature: ${desc.signature.beats_per_bar}/${desc.signature.beat_value}`;

    const beat_cells = [];
    beat_cells.push(document.createElement('td')); // Dummy for track column
    beat_cells.push(this.pointer_el = document.createElement('td'));
    this.pointer_el.classList.add('pointer');
    for(let i = 0; i < desc.beat_count; i++) {
      const beat_cell = document.createElement('td');
      beat_cells.push(beat_cell);
    }
    this.beat_row.replaceChildren(...beat_cells);

    const bar_cells = [];
    bar_cells.push(document.createElement('td')); // Dummy for track column
    bar_cells.push(document.createElement('td')); // Dummy for pointer column
    for(let i = 0; i < desc.beat_count; i += desc.signature.beats_per_bar) {
      const bar_cell = document.createElement('td');
      bar_cell.innerText = (i / desc.signature.beats_per_bar) + 1;
      bar_cell.colSpan = desc.signature.beats_per_bar;
      bar_cells.push(bar_cell);
    }
    this.bar_row.replaceChildren(...bar_cells);

    const chord_cells = [];
    chord_cells.push(document.createElement('td')); // Dummy for track column
    chord_cells.push(document.createElement('td')); // Dummy for pointer column
    const prog_length = desc.progression.length;
    for(let i = 0; i < desc.beat_count; i++) {
      const chord_id = desc.progression[i % prog_length];
      const chord = desc.scale.chords[chord_id];
      const chord_str = `${notes[chord.key]}${chord.suffix}`;
      const chord_cell = document.createElement('td');
      chord_cell.innerText = chord_str;
      let col_span = 1;
      while(desc.progression[(i+1) % prog_length] == desc.progression[i % prog_length]) {
        i++;
        col_span++;
      }
      chord_cell.colSpan = col_span;
      chord_cells.push(chord_cell);
    }
    this.chord_row.replaceChildren(...chord_cells);

    for(let previous_track of [...document.getElementsByClassName('track')]) {
      previous_track.remove();
    }

    for(let track of desc.tracks) {
      const track_row = document.createElement('tr');
      track_row.classList.add('track');

      const track_header = document.createElement('td');
      track_row.appendChild(track_header);

      if(track.instrument) {
        const track_instrument_span = document.createElement('span');
        track_instrument_span.innerText = `${track.instrument.name}`;
        track_header.appendChild(track_instrument_span);
      }

      const track_creator_span = document.createElement('span');
      track_creator_span.innerText = `${track.creator}`;
      track_header.appendChild(track_creator_span);

      track_row.appendChild(document.createElement('td')); // Dummy for pointer column

      for(let pattern_id of track.pattern_list) {
        const pattern = track.patterns[pattern_id];
        const pattern_cell = document.createElement('td');
        const pattern_cell_number = document.createElement('span');
        pattern_cell_number.innerText = `#${pattern_id+1}`;
        pattern_cell.appendChild(pattern_cell_number);
        pattern_cell.colSpan = pattern.size * desc.signature.beats_per_bar;
        pattern_cell.style.backgroundImage = `url('${await this.get_pattern_image(track, pattern)}')`;
        pattern_cell.style.height = `${pattern.img_height*2}px`;
        track_row.appendChild(pattern_cell);
      }

      this.table_el.appendChild(track_row);
    }

    this.section_el.style.display = 'block';
  }

  // Returns time to wait in seconds till next beat
  set_time(t) {
    if(!this.desc) {
      return 1; // One second till next check
    }
    const beat_duration = (60 / this.desc.tempo) * (4 / this.desc.signature.beat_value);
    const current_beat = Math.floor(t / beat_duration);
    const beat_width = this.beat_row.lastChild.clientWidth
    this.pointer_el.style.left = `${beat_width*current_beat}px`;
    this.pointer_el.style.borderBottomWidth = `${this.table_el.clientHeight}px`;
    this.pointer_el.style.marginBottom = `-${this.table_el.clientHeight}px`;
    this.pointer_el.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
    });
    return beat_duration - (t % beat_duration) + 0.04; // Add 40ms to avoid timer setting off too soon
  }

  async get_pattern_image(track, pattern) {
    if(pattern.img) {
      return pattern.img;
    }

    const min_tone = track.min_tone - (track.min_tone % 12); // Use octave boundaries
    const max_tone = track.max_tone + (track.max_tone % 12 ? 12 : 0);
    const height = pattern.img_height = max_tone - min_tone;

    this.pattern_canvas.width = pattern.size * this.desc.bar_ticks;
    this.pattern_canvas.height = height;
    const context = this.pattern_canvas.getContext('2d');
    context.clearRect(0, 0, this.pattern_canvas.width, this.pattern_canvas.height);
    context.fillStyle = '#fff'
    for(let i = 0; i < pattern.note_starts.length; i++) {
      const start = pattern.note_starts[i];
      const duration = pattern.note_durations[i];
      const tone = pattern.note_tones[i];
      context.fillRect(start, height - (tone - min_tone) - 1, duration, 1);
    }

    const blob = await new Promise(resolve => this.pattern_canvas.toBlob(resolve));
    pattern.img = URL.createObjectURL(blob);
    this.music.object_urls.push(pattern.img)

    return pattern.img;
  }
}
