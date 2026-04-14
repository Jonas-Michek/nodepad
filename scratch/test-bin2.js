const fetch = require('node-fetch');

async function test() {
  const url = 'https://api.jsonbin.io/v3/b/69dd642736566621a8ad482c';
  const apiKey = '$2a$10$.RlEN4IPmHxIgl4XbpVp2.SYXcpuW1ltpzFp6Yi1p4EivNIL31B9C';
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Master-Key': apiKey
      }
    });
    console.log('Master Key Status:', res.status);
    console.log('Master Key Body:', await res.text());

    const res2 = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Access-Key': apiKey
      }
    });
    console.log('Access Key Status:', res2.status);
    console.log('Access Key Body:', await res2.text());
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
