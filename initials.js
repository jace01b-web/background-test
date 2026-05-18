(function() {
  // --- About:Blank Cloaking Feature ---
  const handleCloak = () => {
    // Check if we are already inside the about:blank iframe to prevent infinite loops
    if (window.name === 'cloaked' || window.location.protocol === 'about:') {
      return; 
    }
    
    // Open a new about:blank tab
    let win = window.open('about:blank', '_blank');
    if (win) {
      // Style the new window and create an iframe containing the current website
      win.document.body.style.margin = '0';
      win.document.body.style.overflow = 'hidden';
      let iframe = win.document.createElement('iframe');
      iframe.src = window.location.href;
      iframe.name = 'cloaked'; // Mark the iframe so the script knows it's cloaked
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.border = 'none';
      iframe.style.margin = '0';
      win.document.body.appendChild(iframe);
    }

    // Remove the listeners after the first interaction so it doesn't spam windows
    ['click', 'keydown', 'touchstart'].forEach(evt => {
      document.removeEventListener(evt, handleCloak);
    });
  };

  // Add listeners for any user interaction to trigger the cloak
  ['click', 'keydown', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, handleCloak);
  });


  // --- Fullscreen GUI Feature ---
  const imageUrl = "https://cdn-icons-png.flaticon.com/512/6398/6398940.png";
  const iconSize = '32px';

  function init() {
    // Cross-browser function to check if fullscreen is active
    const isFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    // Cross-browser function to request fullscreen
    const requestFullscreen = (element) => {
      if (element.requestFullscreen) element.requestFullscreen();
      else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
      else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
      else if (element.msRequestFullscreen) element.msRequestFullscreen();
    };

    // Cross-browser function to exit fullscreen
    const exitFullscreen = () => {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    };

    // Create the image element
    const fsIcon = document.createElement('img');
    fsIcon.src = imageUrl;
    fsIcon.alt = "Toggle Fullscreen";
    
    // Style the GUI element (small, top-left corner)
    fsIcon.style.position = 'fixed';
    fsIcon.style.top = '10px';
    fsIcon.style.left = '10px';
    fsIcon.style.width = iconSize;
    fsIcon.style.height = iconSize;
    fsIcon.style.cursor = 'pointer';
    fsIcon.style.zIndex = '2147483647'; // Ensure it's always on top
    fsIcon.style.filter = 'invert(100%)'; // Make black image white
    fsIcon.style.display = 'block'; // Ensure visible initially

    // Define the toggle function and set onclick handler
    fsIcon.onclick = function(e) {
      if (!isFullscreen()) {
        requestFullscreen(document.documentElement);
      } else {
        exitFullscreen();
      }
    };

    // Define visibility handling on fullscreen state change
    function handleFullscreenChange() {
      if (isFullscreen()) {
        fsIcon.style.display = 'none'; // Hide in fullscreen
      } else {
        fsIcon.style.display = 'block'; // Show when not in fullscreen
      }
    }

    // Add event listeners for all cross-browser fullscreen change events
    const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    events.forEach(event => document.addEventListener(event, handleFullscreenChange));

    // Append the element to the body
    document.body.appendChild(fsIcon);
  }

  // Run initialization when the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init(); // Document already loaded
  }

})();
