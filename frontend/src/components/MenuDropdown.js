import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

const MenuDropdown = ({ top, left, onClose, children }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      className="menu-dropdown-content origin-top-right absolute rounded-md shadow-lg bg-white border-0 focus:outline-none z-50"
      role="menu"
      aria-orientation="vertical"
      style={{ top: `${top}px`, left: `${left}px` }}
    >
      <div className="py-1">
        {children}
      </div>
    </div>,
    document.body // Append to document.body for global positioning
  );
};

export default MenuDropdown; 