import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import './BranchSelector.css';

const BranchSelector = ({ onBranchChange, selectedBranchId }) => {
  const [branches, setBranches] = useState([]);
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'flat'

  // Fetch organization tree on component mount
  useEffect(() => {
    fetchOrganizationTree();
  }, []);

  const fetchOrganizationTree = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/v1/organizations/tree');
      if (response.data.success) {
        setTree(response.data.data);
        // Flatten tree for flat view
        const flattened = flattenTree(response.data.data);
        setBranches(flattened);
      }
    } catch (err) {
      setError('Failed to load branches: ' + (err.response?.data?.message || err.message));
      console.error('Error fetching organization tree:', err);
    } finally {
      setLoading(false);
    }
  };

  // Flatten tree structure for flat view
  const flattenTree = (nodes, prefix = '') => {
    let flattened = [];
    if (!Array.isArray(nodes)) return flattened;

    nodes.forEach((node) => {
      const displayName = prefix ? `${prefix} > ${node.name}` : node.name;
      flattened.push({
        _id: node._id,
        name: node.name,
        displayName,
        code: node.code,
        type: node.type,
        level: node.level,
        country: node.country,
      });

      if (node.children && node.children.length > 0) {
        flattened = flattened.concat(flattenTree(node.children, displayName));
      }
    });

    return flattened;
  };

  // Toggle node expansion in tree view
  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Handle branch selection
  const handleSelectBranch = (branchId, branchName) => {
    if (onBranchChange) {
      onBranchChange({
        branchId,
        branchName,
      });
    }
  };

  // Render tree view recursively
  const renderTreeNode = (node) => {
    const isExpanded = expandedNodes.has(node._id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node._id} className="branch-tree-node">
        <div className="branch-node-content">
          {hasChildren && (
            <button
              className="expand-button"
              onClick={() => toggleNode(node._id)}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="expand-placeholder" />}

          <button
            className={`branch-name ${selectedBranchId === node._id ? 'selected' : ''}`}
            onClick={() => handleSelectBranch(node._id, node.name)}
          >
            <span className="branch-icon">{getTypeIcon(node.type)}</span>
            <span className="branch-info">
              <span className="name">{node.name}</span>
              <span className="code">{node.code}</span>
            </span>
            {selectedBranchId === node._id && <span className="check-mark">✓</span>}
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="branch-children">
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  // Get icon based on branch type
  const getTypeIcon = (type) => {
    switch (type) {
      case 'HEAD_OFFICE':
        return '🏢';
      case 'REGIONAL':
        return '🏭';
      case 'BRANCH':
        return '🏪';
      case 'STORE':
        return '🛒';
      default:
        return '📍';
    }
  };

  if (loading) {
    return (
      <div className="branch-selector">
        <div className="loading">Loading branches...</div>
      </div>
    );
  }

  return (
    <div className="branch-selector">
      {error && <div className="error-message">{error}</div>}

      <div className="branch-header">
        <h3>Select Branch/Location</h3>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
            onClick={() => setViewMode('tree')}
          >
            Hierarchy
          </button>
          <button
            className={`toggle-btn ${viewMode === 'flat' ? 'active' : ''}`}
            onClick={() => setViewMode('flat')}
          >
            Flat List
          </button>
        </div>
      </div>

      {viewMode === 'tree' && tree && (
        <div className="branch-tree">
          {Array.isArray(tree) && tree.length > 0 ? (
            tree.map((node) => renderTreeNode(node))
          ) : (
            <p className="no-branches">No branches available</p>
          )}
        </div>
      )}

      {viewMode === 'flat' && (
        <div className="branch-flat-list">
          {branches && branches.length > 0 ? (
            <select
              className="branch-dropdown"
              value={selectedBranchId || ''}
              onChange={(e) => {
                const branchId = e.target.value;
                const branch = branches.find((b) => b._id === branchId);
                if (branch) {
                  handleSelectBranch(branch._id, branch.name);
                }
              }}
            >
              <option value="">-- Select a branch --</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.displayName} ({branch.code})
                </option>
              ))}
            </select>
          ) : (
            <p className="no-branches">No branches available</p>
          )}
        </div>
      )}

      <div className="branch-actions">
        <button className="refresh-btn" onClick={fetchOrganizationTree}>
          Refresh
        </button>
      </div>
    </div>
  );
};

BranchSelector.propTypes = {
  onBranchChange: PropTypes.func.isRequired,
  selectedBranchId: PropTypes.string,
};

export default BranchSelector;


