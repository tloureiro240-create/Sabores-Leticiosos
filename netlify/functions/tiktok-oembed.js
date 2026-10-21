exports.handler = async (event) => {
  const input = event.queryStringParameters?.url || '';

  try {
    const parsed = new URL(input);
    const host = parsed.hostname.toLowerCase();

    const youtube=['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(host);
    if (parsed.protocol!=='https:' || !(youtube || host === 'tiktok.com' || host.endsWith('.tiktok.com'))) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'O link tem de ser do TikTok ou YouTube.' })
      };
    }

    let target = input;

    if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com') {
      try {
        const resolved = await fetch(input, {
          method: 'HEAD',
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (resolved.url) target = resolved.url;
      } catch {}
    }

    const response = await fetch(
      (youtube?'https://www.youtube.com/oembed?format=json&url=':'https://www.tiktok.com/oembed?url=') + encodeURIComponent(target),
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    if (!response.ok) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Não foi possível obter os dados deste vídeo. Confirma se o vídeo é público.' })
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      },
      body: JSON.stringify({
        title: data.title || '',
        author_name: data.author_name || '',
        author_url: data.author_url || '',
        thumbnail_url: data.thumbnail_url || '',
        provider_name: data.provider_name || (youtube?'YouTube':'TikTok')
      })
    };
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Link inválido.' })
    };
  }
};