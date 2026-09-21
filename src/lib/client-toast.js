// Client-side only toast wrapper

let toastInstance = null;

// Initialize toast only on client side
const initToast = () => {
  if (typeof window !== 'undefined' && !toastInstance) {
    try {
      // Dynamic import only works on client side
      import('react-hot-toast').then(({ default: toast }) => {
        toastInstance = toast;
      }).catch(() => {
        console.warn('react-hot-toast not available');
      });
    } catch (error) {
      console.warn('Error loading react-hot-toast:', error);
    }
  }
  return toastInstance;
};

// Safe toast functions
export const toastSafe = {
  success: (message) => {
    const toast = initToast();
    if (toast) {
      toast.success(message);
    } else if (typeof window !== 'undefined') {
      console.log('✓ Success:', message);
    }
  },
  
  error: (message) => {
    const toast = initToast();
    if (toast) {
      toast.error(message);
    } else if (typeof window !== 'undefined') {
      console.error('✗ Error:', message);
    }
  },
  
  loading: (message) => {
    const toast = initToast();
    if (toast) {
      toast.loading(message);
    } else if (typeof window !== 'undefined') {
      console.log('⏳ Loading:', message);
    }
  }
};

// Simple toast implementation using browser notifications and visual alerts
const showVisualNotification = (message, type) => {
  if (typeof window === 'undefined') return;
  
  // Create notification container
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 9999;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    ${type === 'success' ? 'background: #10B981;' : 'background: #EF4444;'}
    display: flex;
    align-items: flex-start;
    gap: 12px;
  `;
  
  // Create message content
  const messageContent = document.createElement('div');
  messageContent.style.cssText = `
    flex: 1;
    padding-right: 8px;
  `;
  messageContent.textContent = message;
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = `
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s ease;
    flex-shrink: 0;
  `;
  
  // Add hover effect for close button
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  });
  
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.backgroundColor = 'transparent';
  });
  
  // Close function
  const closeNotification = () => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  };
  
  // Add close button click handler
  closeButton.addEventListener('click', closeNotification);
  
  // Assemble notification
  notification.appendChild(messageContent);
  notification.appendChild(closeButton);
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    closeNotification();
  }, 4000);
};

export const simpleToast = {
  success: (message) => {
    if (typeof window !== 'undefined') {
      showVisualNotification(message, 'success');
    }
  },
  
  error: (message) => {
    if (typeof window !== 'undefined') {
      showVisualNotification(message, 'error');
    }
  }
};
