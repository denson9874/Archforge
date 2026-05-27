async function main() {
  const req = await fetch('http://localhost:3000/api/system/cleanup/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      removeOrphans: true,
      clearSystemCache: true,
      clearAurCache: true,
      selectedOrphans: ['lib32-gcc-libs'],
      selectedAurCaches: ['spotify']
    })
  });
  console.log(req.status);
  const text = await req.text();
  console.log(text);
}
main();
