export const formatCurrency = (amount, currency = 'GHS') => {
  const symbols = { GHS: 'GH₵', USD: '$', GBP: '£', AED: 'AED ' };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${Number(amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const fxConvert = (amount, fromCurrency, rates) => {
  if (fromCurrency === 'GHS') return amount;
  const rate = rates?.[fromCurrency] || 1;
  return amount * rate;
};

export const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
