/**
 * KeyboardHelpModal.jsx
 * Displays all registered global keyboard shortcuts
 * Accessible via Ctrl+? or ? key
 */

import React, { useContext } from 'react';
import { GlobalKeyboardContext } from '../../context/GlobalKeyboardContext';
import Modal from '../shared/Model';
import { X } from 'lucide-react';

const KeyboardHelpModal = () => {
  const { showHelp, setShowHelp, getShortcutsByCategory } = useContext(GlobalKeyboardContext);
  const categories = getShortcutsByCategory();

  const formatShortcut = (shortcut) => {
    return shortcut
      .split('+')
      .map(key => {
        const keyMap = {
          'ctrl': 'Ctrl',
          'shift': 'Shift',
          'alt': 'Alt',
          'meta': 'Cmd',
        };
        return keyMap[key] || key.toUpperCase();
      })
      .join(' + ');
  };

  return (
    <Modal
      isOpen={showHelp}
      onClose={() => setShowHelp(false)}
      title="⌨️ Keyboard Shortcuts"
      width="max-w-2xl"
    >
      <div className="p-4 max-h-[70vh] overflow-y-auto">
        {Object.keys(categories).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No keyboard shortcuts registered yet.</p>
            <p className="text-xs mt-2">Shortcuts will appear here as features are enabled.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(categories)
              .sort(([a], [b]) => {
                const order = ['General', 'Product', 'Navigation', 'Form', 'Search'];
                const aIdx = order.indexOf(a);
                const bIdx = order.indexOf(b);
                return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
              })
              .map(([category, shortcuts]) => (
                <div key={category}>
                  <h3 className="text-sm font-bold text-gray-800 mb-2 pb-2 border-b border-gray-300">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {shortcuts
                      .sort((a, b) => a.normalized.localeCompare(b.normalized))
                      .map((shortcut, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded hover:bg-blue-50 transition"
                        >
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-700">
                              {shortcut.description}
                            </p>
                          </div>
                          <div className="ml-4">
                            <kbd className="px-2 py-1 bg-gray-200 text-gray-800 text-xs font-mono rounded border border-gray-300">
                              {formatShortcut(shortcut.normalized)}
                            </kbd>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs text-blue-700 font-semibold mb-2">💡 Tips:</p>
          <ul className="text-xs text-blue-600 space-y-1">
            <li>• Global shortcuts are disabled when typing in input fields</li>
            <li>• Use Ctrl (Windows) or Cmd (Mac) for most shortcuts</li>
            <li>• Press Ctrl+? or ? to show this help anytime</li>
            <li>• Arrow keys work in dropdowns for keyboard navigation</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default KeyboardHelpModal;
