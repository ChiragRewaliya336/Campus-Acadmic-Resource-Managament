const fs = require('fs');
const path = require('path');

// Create uploads folder if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Simple text content for Word documents
const frontPageContent = 'Front page - AI ml Front page\n\nCreated by: Abhishek\nStatus: Approved\n\nThis is the front page of the AI Machine Learning project documentation.\n\nKey Topics:\n- Machine Learning Fundamentals\n- AI Model Development\n- Frontend Implementation\n- User Interface Design\n\nThis document serves as the gateway to understanding the complete AI ML Front page project.';

const liveProjectContent = 'LIVE PROJECT - Live project format\n\nCreated by: Abhishek\nStatus: Approved\n\nThis is the live project format documentation for the ongoing development.\n\nProject Details:\n- Project Name: Campus Academic Resource Management\n- Version: 1.0.0\n- Status: Live\n- Framework: Express.js + MySQL\n\nFeatures:\n- User Authentication\n- Resource Management\n- Category Management\n- File Upload & Download\n- Admin Dashboard\n\nTechnology Stack:\n- Backend: Node.js, Express.js\n- Database: MySQL\n- Frontend: HTML5, CSS3, JavaScript';

// Write text files that Word can open
fs.writeFileSync(
  path.join(uploadsDir, 'Front_page.txt'),
  frontPageContent
);

fs.writeFileSync(
  path.join(uploadsDir, 'LIVE_PROJECT.txt'),
  liveProjectContent
);

console.log('✓ Front_page.txt created');
console.log('✓ LIVE_PROJECT.txt created');
console.log('Files are ready in: ' + uploadsDir);
