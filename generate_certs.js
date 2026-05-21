const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

async function run() {
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = await selfsigned.generate(attrs, { days: 365 });

  fs.writeFileSync(path.join(__dirname, 'key.pem'), pems.privateKey || pems.private || pems.privatePem);
  fs.writeFileSync(path.join(__dirname, 'cert.pem'), pems.cert || pems.certPem);

  console.log('Certificates generated successfully!');
}

run().catch(console.error);
