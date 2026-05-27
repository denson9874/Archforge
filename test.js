import http from 'http';

http.get('http://localhost:3000/api/system/cleanup/scan', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
