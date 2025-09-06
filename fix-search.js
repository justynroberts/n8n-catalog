// Quick fix for search icon overlap
// Run this in the browser console or inject it into the app

(function() {
  // Fix the CSS for input-uber class
  const style = document.createElement('style');
  style.textContent = `
    .input-uber {
      flex: 1 !important;
      min-width: 0 !important;
      width: auto !important;
    }
    
    /* Ensure search container uses flexbox properly */
    .flex.items-center.gap-3.flex-1 input {
      flex: 1;
      min-width: 0;
    }
  `;
  document.head.appendChild(style);
  
  console.log('Search icon overlap fix applied');
})();