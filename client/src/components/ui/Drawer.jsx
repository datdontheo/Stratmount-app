import { useEffect } from 'react';

export default function Drawer({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />}
      <div
        className={`fixed top-0 right-0 h-full z-50 w-full max-w-md bg-bg-secondary border-l border-border flex flex-col shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-white text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-tertiary"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </>
  );
}
