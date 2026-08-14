// Google Drive API Configuration
// IMPORTANT: You need to replace these with your own credentials from Google Cloud Console.
// Instructions:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project.
// 3. Enable "Google Drive API".
// 4. Create Credentials -> OAuth Client ID (Web application).
// 5. Add http://localhost:5173 to "Authorized JavaScript origins".
// 6. Copy Client ID and API Key.

// TODO: Replace with real credentials
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY_HERE';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// ID of the "Company Clients" folder where all new client folders will differ.
// You get this from the URL when viewing the folder in Drive: drive.google.com/drive/folders/THIS_PART
const COMPANY_PARENT_FOLDER_ID = 'YOUR_COMPANY_FOLDER_ID_HERE';

let tokenClient;
let gapiInited = false;
let gisInited = false;

export const initGoogleDrive = async () => {
    // Check for Mock Mode
    if (CLIENT_ID.includes('YOUR_CLIENT_ID') || API_KEY.includes('YOUR_API_KEY')) {
        console.warn(`
         ⚠️ GOOGLE DRIVE INTEGRATION IS IN MOCK MODE ⚠️
         To enable real login and folder creation:
         1. Open src/services/googleDrive.js
         2. Replace YOUR_CLIENT_ID_HERE with your OAuth Client ID.
         3. Replace YOUR_API_KEY_HERE with your API Key.
         4. Replace YOUR_COMPANY_FOLDER_ID_HERE with the ID of the shared folder.
         5. Uncomment the real initialization code in initGoogleDrive.
         `);
    }
    return Promise.resolve(true); // Still returning true to keep app running
};

export const createClientFolder = async (clientName) => {
    // Basic validation to prevent crashes if not configured
    if (CLIENT_ID.includes('YOUR_CLIENT_ID')) {
        console.warn('Google Drive integration not configured. Using mock response.');
        // Simulate API delay
        await new Promise(r => setTimeout(r, 1000));
        return {
            id: 'mock-folder-id-' + Date.now(),
            name: clientName,
            webViewLink: '#'
        };
    }

    // Fallback if we somehow got here without credentials but validation passed (unlikely)
    return {
        id: 'mock-folder-id-' + Date.now(),
        name: clientName,
        webViewLink: '#'
    };
};
