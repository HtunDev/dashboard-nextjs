'use client';

import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, children, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;

  // Only render portal if we're in the browser
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity z-0"
          onMouseDown={onClose}
        />
        <div
          className={`relative z-10 bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all ${maxWidth} w-full pointer-events-auto`}
          onMouseDown={(e) => e.stopPropagation() }
        >
          {/* Dismiss Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full p-1"
          >
            <X className="h-5 w-5" />
          </button>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  maxWidth: PropTypes.string,
};

Modal.defaultProps = {
  children: null,
  maxWidth: 'max-w-2xl',
};

export default Modal;


