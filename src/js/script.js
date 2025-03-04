const api_endpoint = location.host ? 'https://api.lutopia.net' : 'http://localhost:24310';
async function api(path, init) {
  return (await fetch(`${api_endpoint}${path}`, init)).json();
}
function api_filepath(filename) {
  return `${api_endpoint}/tmp/${filename}`
}

window.addEventListener('load', async function() {
  const player = new Player();

  // Setup configuration menu
  const config_select_el = document.getElementById('configuration');
  const configs = await api('/steve/configurations');
  for(let config of configs) {
    const config_el = this.document.createElement('option');
    config_el.value = config;
    config_el.innerText = config; // TODO: make prettier
    config_select_el.appendChild(config_el);
  }
  config_select_el.value = player.config;
  config_select_el.addEventListener('change', e => {
    player.set_config(e.target.value);
  });

  // Setup buttons
  const previous_button_el = document.getElementById('previous_button');
  previous_button_el.addEventListener('click', () => player.change_track(-1));
  const next_button_el = document.getElementById('next_button');
  next_button_el.addEventListener('click', () => player.change_track(+1));
  const download_button_el = document.getElementById('download_button');
  download_button_el.addEventListener('click', () => player.download_current_music());;

  await player.update_playlist();
});
