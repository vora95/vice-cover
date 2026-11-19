// Vice Cover — PNG export. Renders the full-size cover offscreen with the
// exact same render function as the preview, then downloads it.

// Render the cover at full export size and trigger a download.
// Returns a Promise that resolves with the file name.
function exportPng(state) {
  return new Promise((resolve, reject) => {
    const { w, h } = SIZES[state.size];
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    try {
      renderCover(ctx, w, h, state);
    } catch (err) {
      reject(err);
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('PNG export failed.')); return; }
      const name = `vice-cover-${state.size}.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve(name);
    }, 'image/png');
  });
}
