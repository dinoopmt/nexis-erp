const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/groupings/getgroupings',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('=== DEPARTMENTS (Level 1) ===');
      const groupings = result.groupings || result;
      const level1 = Array.isArray(groupings) 
        ? groupings.filter(g => g.level === '1' || g.level === 1)
        : Object.values(groupings).flat().filter(g => g.level === '1' || g.level === 1);
      
      level1.slice(0, 5).forEach(dept => {
        const idStr = String(dept._id);
        console.log(`  ID: ${idStr.substring(0, 20)}... | Name: ${dept.name}`);
      });
      
      console.log('\n=== CHECKING MEILISEARCH MATCH ===');
      console.log('Meilisearch had categoryId: "COSMECTICS"');
      const match = level1.find(d => d.name === 'COSMECTICS' || String(d._id) === 'COSMECTICS');
      if (match) {
        console.log('FOUND MATCH:', match.name, '- ID:', match._id);
      } else {
        console.log('NO MATCH FOUND - checking if COSMECTICS is a name or ID...');
        const nameMatch = level1.find(d => d.name.includes('COSMET'));
        if (nameMatch) {
          console.log('Found similar by name:', nameMatch.name, '- ID:', String(nameMatch._id));
        }
        const idMatch = level1.find(d => String(d._id).includes('COSMET'));
        if (idMatch) {
          console.log('Found similar by ID:', idMatch.name, '- ID:', String(idMatch._id));
        }
      }
      
      console.log('\n=== ALL DEPT NAMES AND IDS ===');
      level1.forEach(dept => {
        console.log(`${dept.name} -> ${String(dept._id)}`);
      });
      
    } catch(e) {
      console.error('Error:', e.message);
      console.error(e.stack);
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
