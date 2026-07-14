export function WhatsAppFAB() {
  return (
    <a
      href="https://wa.me/255754000000"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with our front desk on WhatsApp"
      className="fixed bottom-6 right-6 z-50 bg-sage text-espresso h-12 pl-4 pr-5 rounded-full shadow-lg flex items-center gap-2 hover:scale-105 hover:bg-sage/90 transition-transform ring-1 ring-black/5"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        <path d="M20.5 3.5A11 11 0 0 0 3.6 17l-1.6 5.8 6-1.6a11 11 0 0 0 16.4-9.5 11 11 0 0 0-3.9-8.2Zm-8.5 17a9 9 0 0 1-4.6-1.3l-.3-.2-3.5.9.9-3.4-.2-.4A9 9 0 1 1 12 20.5Zm5-6.7c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1s-.7.9-.9 1c-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.5l-.9-2.1c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.1 0 1.3.9 2.5 1 2.7.1.2 1.9 2.9 4.6 4 .6.3 1.1.5 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.6-.6 1.8-1.3.2-.6.2-1.1.2-1.2-.1-.2-.3-.3-.6-.4Z" />
      </svg>
      <span className="text-sm font-medium">WhatsApp</span>
    </a>
  );
}