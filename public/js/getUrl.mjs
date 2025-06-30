export const getUrl = async (url) => {
  const content = document.getElementById('content');
  const res = await fetch(`/tiktok/api.php?url=${encodeURIComponent(url)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  const { audio, video } = await res.json();

  // Botones con onclick para forzar descarga
  const buttons = `
    <button onclick="downloadFile('${audio[0]}', 'audio.mp3')" class='btn'>Download Audio</button>
    <button onclick="downloadFile('${video[0]}', 'video.mp4')" class='btn'>Download Video</button>
  `;

  const videoElement = `
    <video controls autoplay name="media">
      <source src="${video[0]}" type="video/mp4">
    </video>
  `;

  content.innerHTML = `${buttons} ${videoElement}`;
};

// Esta función forza la descarga aunque el servidor no lo permita
window.downloadFile = async (url, filename) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(blobUrl);
};
