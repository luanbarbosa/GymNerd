(async function() {
    let storedHash = "__PASSWORD_HASH__";
    
    if (!storedHash || storedHash.length < 10) {
        console.error("Auth Error: APP_PASSWORD_HASH secret appears to be missing or empty in GitHub Settings.");
        return;
    }
    console.log("Auth status: Protected");

    // Ensure we are in a secure context for crypto.subtle
    if (!window.crypto || !window.crypto.subtle) {
        alert("Security Error: This browser does not support the required cryptography features. Please use HTTPS or a modern browser.");
        return;
    }

    if (sessionStorage.getItem('gym_access') === 'true') return;

    const password = prompt("Please enter the password to access GymNerd:");
    if (!password) {
        renderDenied();
        return;
    }

    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex !== storedHash) {
        alert("Incorrect password!");
        renderDenied();
    } else {
        sessionStorage.setItem('gym_access', 'true');
    }

    function renderDenied() {
        document.documentElement.innerHTML = `
            <body style="background: #0f172a; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center;">
                <div>
                    <h1 style="font-size: 3rem; margin-bottom: 10px;">Access Denied</h1>
                    <p style="color: #94a3b8; margin-bottom: 20px;">A valid password is required to use GymNerd.</p>
                    <button onclick="location.reload()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: bold;">Try Again</button>
                </div>
            </body>`;
    }
})();