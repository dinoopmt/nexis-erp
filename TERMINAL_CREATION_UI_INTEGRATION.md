# Terminal Creation Integration with Store Settings UI

## Overview

Terminals are now created **directly from the Store Settings UI** with **license-based limits**.

---

## How It Works

### Transaction Flow

```
User clicks "Add Terminal" in Store Settings UI
    ↓
Submit terminal form with terminalId, name, config
    ↓
API validates terminal data
    ↓
Create terminal ✅
    ↓
Return terminal data with success message
```

---

## API Endpoints

### Create Terminal
```bash
POST /api/v1/terminals/create
Content-Type: application/json

Body:
{
  "terminalId": "POS-002",
  "terminalName": "Counter 2",
  "storeId": "STORE_ID",
  "hardware": {...},
  "printingFormats": {...},
  "salesControls": {...}
}

Response:
{
  "success": true,
  "message": "Terminal created successfully",
  "data": { ...terminal document... }
}
```

### Get All Terminals
```bash
GET /api/v1/terminals/store/STORE_ID

Response:
{
  "success": true,
  "count": 3,
  "data": [...terminals...]
}
```

### Get Terminal by ID
```bash
GET /api/v1/terminals/:terminalId

Response:
{
  "success": true,
  "data": { ...terminal document... }
}
```

### Update Terminal
```bash
PUT /api/v1/terminals/:terminalId
Content-Type: application/json

Body: { ...updated fields... }

Response:
{
  "success": true,
  "message": "Terminal updated successfully",
  "data": { ...updated terminal... }
}
```

### Delete Terminal
```bash
DELETE /api/v1/terminals/:terminalId

Response:
{
  "success": true,
  "message": "Terminal deleted successfully"
}
```

---

## Frontend Implementation (React)

### 1. Get Terminals on Component Load

```javascript
import { useEffect, useState } from 'react';
import axios from 'axios';

const StoreSettingsTerminals = () => {
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchTerminals();
  }, []);

  const fetchTerminals = async () => {
    try {
      const storeId = localStorage.getItem('storeId');
      const response = await axios.get(
        `/api/v1/terminals/store/${storeId}`
      );
      setTerminals(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch terminals:', error);
      setLoading(false);
    }
  };

  return (
    <div className="terminals-section">
      <h2>Terminal Management</h2>
      
      {/* Add Terminal Button */}
      <button 
        className="btn btn-primary"
        onClick={() => setShowAddModal(true)}
      >
        + Add Terminal
      </button>

      {/* Terminals List */}
      <div className="terminals-list">
        {loading ? (
          <p>Loading terminals...</p>
        ) : terminals.length === 0 ? (
          <p>No terminals created yet.</p>
        ) : (
          terminals.map(terminal => (
            <TerminalCard 
              key={terminal._id} 
              terminal={terminal}
              onRefresh={fetchTerminals}
            />
          ))
        )}
      </div>

      {/* Add Terminal Modal */}
      {showAddModal && (
        <AddTerminalModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchTerminals();
          }}
          storeId={localStorage.getItem('storeId')}
        />
      )}
    </div>
  );
};

export default StoreSettingsTerminals;
```

### 2. Create Terminal Form

```javascript
const AddTerminalModal = ({ onClose, onSuccess, storeId }) => {
  const [formData, setFormData] = useState({
    terminalId: '',
    terminalName: '',
    hardware: {
      primaryPrinter: { printerModel: 'ZEBRA', printerPort: 'LPT1' },
      labelPrinter: { printerModel: 'BROTHER', printerPort: 'COM1' }
    },
    printingFormats: {
      receiptFormat: { type: 'THERMAL', width: 80 }
    },
    salesControls: {
      enableCreditSale: true,
      enableReturns: true
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        '/api/v1/terminals/create',
        {
          ...formData,
          storeId
        }
      );

      if (response.data.success) {
        alert('✅ Terminal created successfully!');
        onSuccess(response.data.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create terminal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      <h3>Add New Terminal</h3>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Terminal ID */}
        <div className="form-group">
          <label>Terminal ID *</label>
          <input
            type="text"
            placeholder="e.g., POS-001"
            value={formData.terminalId}
            onChange={(e) => setFormData({...formData, terminalId: e.target.value})}
            required
          />
        </div>

        {/* Terminal Name */}
        <div className="form-group">
          <label>Terminal Name *</label>
          <input
            type="text"
            placeholder="e.g., Main Counter"
            value={formData.terminalName}
            onChange={(e) => setFormData({...formData, terminalName: e.target.value})}
            required
          />
        </div>

        {/* Hardware & Config sections... */}

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Terminal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTerminalModal;
```

### 3. Terminal Card Component

```javascript
const TerminalCard = ({ terminal, onRefresh }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete terminal "${terminal.terminalName}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await axios.delete(`/api/v1/terminals/${terminal._id}`);
      alert('✅ Terminal deleted successfully');
      onRefresh();
    } catch (error) {
      alert('❌ Failed to delete terminal: ' + error.response?.data?.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="terminal-card">
      <div className="card-header">
        <h4>{terminal.terminalName}</h4>
        <span className={`status ${terminal.terminalStatus.toLowerCase()}`}>
          {terminal.terminalStatus}
        </span>
      </div>

      <div className="card-body">
        <p><strong>ID:</strong> {terminal.terminalId}</p>
        <p><strong>Status:</strong> {terminal.connectivity.isOnline ? '🟢 Online' : '🔴 Offline'}</p>
        
        <div className="hardware">
          <h5>Hardware</h5>
          {terminal.hardware.primaryPrinter?.isConfigured && (
            <p>✅ Primary Printer: {terminal.hardware.primaryPrinter.printerModel}</p>
          )}
          {terminal.hardware.labelPrinter?.isConfigured && (
            <p>✅ Label Printer: {terminal.hardware.labelPrinter.printerModel}</p>
          )}
        </div>

        <div className="controls">
          <button className="btn-secondary">Edit</button>
          <button 
            className="btn-danger" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## Integration Checklist

- [ ] Create terminal management tab in Store Settings menu
- [ ] Display list of existing terminals on load
- [ ] Add "Add Terminal" button to create new terminals
- [ ] Create modal form for terminal configuration
- [ ] Implement terminal edit functionality
- [ ] Implement terminal delete functionality with confirmation
- [ ] Display terminal status (Online/Offline)
- [ ] Show error messages from API clearly
- [ ] Add loading states during CRUD operations
- [ ] Refresh terminal list after create/edit/delete

---

## Example Integration in Store Settings Menu

```javascript
const StoreSettingsMenu = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="store-settings">
      <div className="tabs">
        <button 
          className={activeTab === 'general' ? 'active' : ''}
          onClick={() => setActiveTab('general')}
        >
          General Settings
        </button>
        <button 
          className={activeTab === 'terminals' ? 'active' : ''}
          onClick={() => setActiveTab('terminals')}
        >
          Terminals
        </button>
        <button 
          className={activeTab === 'printers' ? 'active' : ''}
          onClick={() => setActiveTab('printers')}
        >
          Printers
        </button>
        <button 
          className={activeTab === 'controls' ? 'active' : ''}
          onClick={() => setActiveTab('controls')}
        >
          Controls
        </button>
      </div>

      <div className="content">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'terminals' && <StoreSettingsTerminals />}
        {activeTab === 'printers' && <PrinterSettings />}
        {activeTab === 'controls' && <ControlSettings />}
      </div>
    </div>
  );
};
```

---

## Summary

✅ **Terminal creation integrated with Store Settings UI**
✅ **Simple CRUD operations** (Create, Read, Update, Delete)
✅ **No license restrictions** (to be added later)
✅ **Terminal list display** with status indicators
✅ **Delete with confirmation**
✅ **Error handling** for all operations

**Ready to implement in your Store Settings UI!**
