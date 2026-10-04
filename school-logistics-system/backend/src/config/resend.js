// HTTPS transport for hosts that block outbound SMTP.
function configuration() {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) throw Object.assign(new Error('Set RESEND_API_KEY and EMAIL_FROM on the backend host.'), { code: 'EMAIL_CONFIGURATION' });
  return { key, from };
}

async function sendMail(message) {
  const { key, from } = configuration();
  let response;
  let data;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...message, from, to: [message.to] }),
      signal: AbortSignal.timeout(15000),
    });
    data = await response.json();
  } catch (error) {
    throw Object.assign(new Error('Email HTTPS request failed.'), {
      code: ['TimeoutError', 'AbortError'].includes(error.name) ? 'ETIMEDOUT' : 'EMAIL_HTTP_CONNECTION',
    });
  }
  if (!response.ok || typeof data?.id !== 'string' || !data.id) {
    // Provider responses can contain private information; log only status codes.
    throw Object.assign(new Error('Email provider did not accept the message.'), {
      code: 'EMAIL_PROVIDER_REJECTED', responseCode: response.status,
    });
  }
  return { messageId: data.id, accepted: [message.to], rejected: [] };
}

module.exports = { sendMail, configuration };
