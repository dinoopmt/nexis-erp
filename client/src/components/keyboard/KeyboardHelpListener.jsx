/**
 * KeyboardHelpListener.jsx
 * Listens for keyboard help event and manages modal visibility
 */

import { useContext, useEffect } from 'react';
import { GlobalKeyboardContext } from '../../context/GlobalKeyboardContext';

export const KeyboardHelpListener = () => {
  const { setShowHelp } = useContext(GlobalKeyboardContext);

  useEffect(() => {
    const handleOpenHelp = () => {
      setShowHelp(true);
    };

    window.addEventListener('openKeyboardHelp', handleOpenHelp);
    return () => window.removeEventListener('openKeyboardHelp', handleOpenHelp);
  }, [setShowHelp]);

  return null;
};

export default KeyboardHelpListener;
