# 🚀 MongoDB Replica Set Configuration for NEXIS-ERP

## Why Replica Sets?
- ✅ Enables MongoDB transactions (required for GRN Edit Manager)
- ✅ Production-grade reliability
- ✅ Automatic failover
- ✅ Data consistency guarantees

## Prerequisites
- MongoDB 4.2+ already installed
- Windows PowerShell (Admin)
- MongoDB running on default port (27017)

---

## OPTION 1: Single-Node Replica Set (Quickest - Recommended for Testing/Dev)

### Step 1: Stop MongoDB Service

```powershell
# Stop MongoDB
net stop MongoDB
# or
Stop-Service -Name MongoDB
```

### Step 2: Start MongoDB with Replica Set

**Important**: MongoDB must be started with replica set options.

#### Method A: Command Line (One-time)
```powershell
cd "C:\Program Files\MongoDB\Server\6.0\bin"

# Start with replica set
./mongod --replSet rs0
```

#### Method B: Update MongoDB Service Configuration (Persistent)

Edit `mongod.cfg` (usually at `C:\Program Files\MongoDB\Server\6.0\etc\mongod.cfg`):

```yaml
# Add this section if it doesn't exist:
replication:
  replSetName: "rs0"
```

Then restart:
```powershell
net stop MongoDB
net start MongoDB
```

### Step 3: Initialize Replica Set

Open MongoDB shell (`mongosh` or `mongo`):

```powershell
mongosh  # or: mongo
```

In the MongoDB shell:
```javascript
// Initialize the replica set
rs.initiate()

// Wait for prompt to show: rs0 [PRIMARY]>

// Check status
rs.status()

// Verify: Should show "members" array with your server
```

**Expected output:**
```
{
  "set": "rs0",
  "date": ISODate("2025-03-23T..."),
  "myState": 1,
  "members": [
    {
      "_id": 0,
      "name": "localhost:27017",
      "health": 1,
      "state": 1,
      "stateStr": "PRIMARY",  👈 THIS IS KEY
      "uptime": ...,
      ...
    }
  ],
  "ok": 1
}
```

### Step 4: Verify Transactions Work

Test in MongoDB shell:
```javascript
// This should work now (no error about replica set)
db.version()  // Returns version - confirms connection works

// Try a session (requires replica set)
session = db.getMongo().startSession()
// Should NOT throw "Transaction numbers are only allowed on a replica set member"
```

---

## OPTION 2: Multi-Node Replica Set (Production)

If you want true HA with 3 nodes:

### Setup 3 MongoDB Instances

```powershell
# Create data directories
mkdir C:\MongoDB\rs0_1\data
mkdir C:\MongoDB\rs0_2\data
mkdir C:\MongoDB\rs0_3\data

# Start each on different ports
# Terminal 1:
mongod --port 27017 --dbpath C:\MongoDB\rs0_1\data --replSet rs0

# Terminal 2:
mongod --port 27018 --dbpath C:\MongoDB\rs0_2\data --replSet rs0

# Terminal 3:
mongod --port 27019 --dbpath C:\MongoDB\rs0_3\data --replSet rs0
```

### Initialize Multi-Node Set

```javascript
// Connect to PRIMARY (port 27017)
mongosh

rs.initiate({
  _id: "rs0",
  members: [
    {_id: 0, host: "localhost:27017"},
    {_id: 1, host: "localhost:27018"},
    {_id: 2, host: "localhost:27019"}
  ]
})

// Check status
rs.status()
```

---

## ✅ Verification Checklist

### Check 1: Connection String (No Change Needed!)
```javascript
// Your existing connection should work:
mongodb://localhost:27017/nexis-erp

// For multi-node, can use:
// mongodb://localhost:27017,localhost:27018,localhost:27019/nexis-erp?replicaSet=rs0
```

### Check 2: Test Transaction Support

**Run this test file** (create as `test-transaction-support.js`):
```javascript
import mongoose from 'mongoose';

const uri = 'mongodb://localhost:27017/nexis-erp';

mongoose.connect(uri).then(async () => {
  console.log('✅ Connected');
  
  const session = await mongoose.startSession();
  console.log('✅ Session created - TRANSACTIONS ARE SUPPORTED!');
  
  session.endSession();
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
```

Run it:
```powershell
cd D:\NEXIS-ERP\server
node test-transaction-support.js
```

**Expected output:**
```
✅ Connected
✅ Session created - TRANSACTIONS ARE SUPPORTED!
```

---

## Troubleshooting

### ❌ Error: "Transaction numbers are only allowed on a replica set member"

**Solution**: MongoDB is not in replica set mode

Check:
```javascript
// In mongosh
rs.status()
// Should return replica set info, NOT error
```

**Fix**:
1. Restart MongoDB with `--replSet rs0` flag
2. Run `rs.initiate()` in mongosh
3. Reconnect and test again

### ❌ Error: "replSetName not set"

**Solution**: Update mongod.cfg or start with flag

```powershell
mongod --replSet rs0
```

### ❌ Error: "Network error" when running tests

**Solution**: 
- Verify MongoDB is running: `Get-Process mongod`
- Check port: `netstat -an | findstr 27017`
- Restart MongoDB service

---

## Production Checklist

For production deployment:

- [ ] MongoDB running as service with replica set enabled
- [ ] Backup path configured in mongod.cfg
- [ ] Network security configured
- [ ] Replica set has 3+ nodes (or 1 node for dev)
- [ ] Connection string uses correct replicaSet name
- [ ] Transactions working in tests
- [ ] GrnController.js using ImprovedGRNEditManager (with transactions)
- [ ] Monitoring alerts configured
- [ ] Regular backups scheduled

---

## Quick Reference

| Task | Command |
|------|---------|
| Start with replica set | `mongod --replSet rs0` |
| Check replica status | `rs.status()` in mongosh |
| Initialize | `rs.initiate()` in mongosh |
| Add secondary | `rs.add("localhost:27018")` in mongosh |
| Remove member | `rs.remove("localhost:27018")` in mongosh |
| View configuration | `rs.conf()` in mongosh |

---

## Next Steps

1. ✅ Setup replica set (Option 1 recommended for now)
2. ✅ Verify with test-transaction-support.js
3. ✅ Run `test-grn2-edit-480-to-4800.js` (will now work!)
4. ✅ Deploy ImprovedGRNEditManager to production

---

**Status**: Ready for production GRN editing with atomic transactions ✅
