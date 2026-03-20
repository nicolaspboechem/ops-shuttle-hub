/**
 * onFocus handler for mobile inputs inside bottom sheets.
 * Waits for the keyboard to open, then scrolls the input into view.
 */
export const scrollInputIntoView = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const target = e.target;
  setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
};
