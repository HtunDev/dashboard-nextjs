// Simple client-side toast implementation.
const showVisualNotification = (message, type) => {
  if (typeof window === 'undefined') return;

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

  const messageContent = document.createElement('div');
  messageContent.style.cssText = `
    flex: 1;
    padding-right: 8px;
  `;
  messageContent.textContent = message;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
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

  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  });

  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.backgroundColor = 'transparent';
  });

  const closeNotification = () => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  };

  closeButton.addEventListener('click', closeNotification);

  notification.appendChild(messageContent);
  notification.appendChild(closeButton);
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  setTimeout(() => {
    closeNotification();
  }, 4000);
};

export const simpleToast = {
  success: (message) => {
    showVisualNotification(message, 'success');
  },

  error: (message) => {
    showVisualNotification(message, 'error');
  },
};

export const toastSafe = {
  ...simpleToast,
  loading: () => {},
};
