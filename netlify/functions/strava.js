const STRAVA_CLIENT_ID = '255765';
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || '4a729dae0bcc7111b40d8bb5b7f7d60b631b6271';

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const body = event.body ? JSON.parse(event.body) : {};
  const action = params.action || body.action;

  // OAuth callback from Strava
  if (params.code && !action) {
    try {
      const tokenRes = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code: params.code,
          grant_type: 'authorization_code'
        })
      });
      const tokenData = await tokenRes.json();
      if (tokenData.errors) throw new Error(JSON.stringify(tokenData.errors));

      const fragment = encodeURIComponent(JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        athlete: {
          id: tokenData.athlete.id,
          firstname: tokenData.athlete.firstname,
          lastname: tokenData.athlete.lastname,
          profile: tokenData.athlete.profile
        }
      }));

      return {
        statusCode: 302,
        headers: {
          ...headers,
          'Content-Type': 'text/html',
          'Location': 'https://statuesque-quokka-cfd889.netlify.app/#strava=' + fragment
        },
        body: ''
      };
    } catch(e) {
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'text/html' },
        body: '<h2>Auth error: ' + e.message + '</h2><a href="https://statuesque-quokka-cfd889.netlify.app">Back to app</a>'
      };
    }
  }

  // Refresh token
  if (action === 'refresh') {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: body.refresh_token,
        grant_type: 'refresh_token'
      })
    });
    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  }

  // Fetch activities
  if (action === 'activities') {
    const res = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=' + (body.per_page || 20) + '&page=' + (body.page || 1),
      { headers: { 'Authorization': 'Bearer ' + body.access_token } }
    );
    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
};
