const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Get version from package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;
const tag = `v${version}`;
console.log(`[RELEASE] Starting release process for tag: ${tag}`);

// 2. Get GitHub token from Git Credential Manager
let token = '';
try {
  const gcmOutput = execSync('git credential fill', {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8'
  });
  const passwordLine = gcmOutput.split('\n').find(line => line.startsWith('password='));
  if (passwordLine) {
    token = passwordLine.substring('password='.length).trim();
  }
} catch (e) {
  console.error('[ERROR] Failed to fetch GCM credentials:', e.message);
}

if (!token) {
  console.error('[ERROR] Could not retrieve GitHub token from Git Credential Manager.');
  process.exit(1);
}
console.log('[RELEASE] Successfully retrieved GitHub token.');

// 3. Create and push Git tag
try {
  console.log(`[GIT] Checking if tag ${tag} exists...`);
  const existingTags = execSync('git tag', { encoding: 'utf8' }).split('\n');
  if (!existingTags.includes(tag)) {
    console.log(`[GIT] Creating tag ${tag}...`);
    execSync(`git tag ${tag}`);
  } else {
    console.log(`[GIT] Tag ${tag} already exists locally.`);
  }

  console.log(`[GIT] Pushing tag ${tag} to origin...`);
  execSync(`git push origin ${tag}`);
  console.log(`[GIT] Successfully pushed tag to origin.`);
} catch (e) {
  console.error('[ERROR] Failed during git operations:', e.message);
  // Continue anyway in case the tag was already pushed online
}

// Helper for https requests
function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : {});
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  const owner = 'Triboott';
  const repo = 'onetricks-client';

  // 4. Create Release on GitHub
  let releaseId = null;
  console.log(`[API] Creating release for tag ${tag}...`);
  try {
    const releaseData = await request({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases`,
      method: 'POST',
      headers: {
        'User-Agent': 'node.js',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      }
    }, {
      tag_name: tag,
      target_commitish: 'main',
      name: `Onetricks Client v${version}`,
      body: `Lanzamiento automático de la versión ${version} para Onetricks Client.`,
      draft: false,
      prerelease: false
    });
    releaseId = releaseData.id;
    console.log(`[API] Release created successfully with ID: ${releaseId}`);
  } catch (e) {
    if (e.message.includes('already_exists')) {
      console.log(`[API] Release already exists. Fetching existing release...`);
      const releases = await request({
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases`,
        method: 'GET',
        headers: {
          'User-Agent': 'node.js',
          'Authorization': `token ${token}`
        }
      });
      const existingRelease = releases.find(r => r.tag_name === tag);
      if (existingRelease) {
        releaseId = existingRelease.id;
        console.log(`[API] Found existing release with ID: ${releaseId}`);
      }
    }
    if (!releaseId) {
      console.error('[ERROR] Failed to create or retrieve release:', e.message);
      process.exit(1);
    }
  }

  // 5. Upload files to Release
  const filesToUpload = [
    { name: `Onetricks-Client-Setup-${version}.exe`, path: `dist/Onetricks Client Setup ${version}.exe` },
    { name: `Onetricks-Client-Setup-${version}.exe.blockmap`, path: `dist/Onetricks Client Setup ${version}.exe.blockmap` },
    { name: 'latest.yml', path: 'dist/latest.yml' }
  ];

  for (const file of filesToUpload) {
    const filePath = path.resolve(file.path);
    if (!fs.existsSync(filePath)) {
      console.error(`[ERROR] File not found: ${filePath}`);
      continue;
    }

    console.log(`[API] Uploading ${file.name} (${fs.statSync(filePath).size} bytes)...`);
    const fileContent = fs.readFileSync(filePath);

    // Delete existing asset with same name if it exists to avoid conflicts
    try {
      const assets = await request({
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases/${releaseId}/assets`,
        method: 'GET',
        headers: {
          'User-Agent': 'node.js',
          'Authorization': `token ${token}`
        }
      });
      const existingAsset = assets.find(a => a.name === file.name);
      if (existingAsset) {
        console.log(`[API] Asset ${file.name} already exists. Deleting first...`);
        await request({
          hostname: 'api.github.com',
          path: `/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`,
          method: 'DELETE',
          headers: {
            'User-Agent': 'node.js',
            'Authorization': `token ${token}`
          }
        });
        console.log(`[API] Asset ${file.name} deleted successfully.`);
      }
    } catch (e) {
      console.warn(`[WARNING] Failed checking/deleting asset:`, e.message);
    }

    // Upload asset
    try {
      await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'uploads.github.com',
          path: `/repos/${owner}/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(file.name)}`,
          method: 'POST',
          headers: {
            'User-Agent': 'node.js',
            'Authorization': `token ${token}`,
            'Content-Type': 'application/octet-stream',
            'Content-Length': fileContent.length
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`[API] Uploaded ${file.name} successfully.`);
              resolve();
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          });
        });
        req.on('error', reject);
        req.write(fileContent);
        req.end();
      });
    } catch (e) {
      console.error(`[ERROR] Failed uploading ${file.name}:`, e.message);
    }
  }

  console.log(`[RELEASE] Completed publication process successfully for v${version}!`);
}

main().catch(err => {
  console.error('[ERROR] Unexpected error in release script:', err);
  process.exit(1);
});
