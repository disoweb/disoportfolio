// Debug script to analyze sessionStorage behavior during checkout flow
console.log('=== DEBUG SESSION START ===');
console.log('Current URL:', window.location.href);
console.log('Pending checkout raw:', sessionStorage.getItem('pendingCheckout'));

if (sessionStorage.getItem('pendingCheckout')) {
  try {
    const data = JSON.parse(sessionStorage.getItem('pendingCheckout'));
    console.log('Parsed pending checkout:', data);
    console.log('Service in data:', data.service);
    console.log('Service name:', data.service?.name);
    console.log('Total price:', data.totalPrice);
    console.log('Selected addons:', data.selectedAddOns);
  } catch (e) {
    console.error('Error parsing:', e);
  }
}

// Check all sessionStorage keys
console.log('All sessionStorage keys:');
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  console.log(`${key}:`, sessionStorage.getItem(key));
}