// Lightweight English/Kannada strings for the worker app
const KN = {
  'Kaam Ready':'ಕಾಮ್ ರೆಡಿ',
  'ONLINE':'ಆನ್‌ಲೈನ್', 'OFFLINE':'ಆಫ್‌ಲೈನ್',
  'You are Offline':'ನೀವು ಆಫ್‌ಲೈನ್ ಆಗಿದ್ದೀರಿ',
  'Toggle the switch above to start receiving jobs':'ಕೆಲಸಗಳನ್ನು ಪಡೆಯಲು ಮೇಲಿನ ಸ್ವಿಚ್ ಆನ್ ಮಾಡಿ',
  'Go Online Now':'ಈಗ ಆನ್‌ಲೈನ್ ಆಗಿ',
  'Waiting for jobs...':'ಕೆಲಸಗಳಿಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ...',
  "You'll be notified instantly when a job matches":'ಕೆಲಸ ಬಂದ ತಕ್ಷಣ ನಿಮಗೆ ತಿಳಿಸಲಾಗುವುದು',
  'New Job Request!':'ಹೊಸ ಕೆಲಸದ ವಿನಂತಿ!',
  'Service':'ಸೇವೆ', 'Address':'ವಿಳಾಸ', 'City':'ನಗರ', 'Customer':'ಗ್ರಾಹಕ',
  'Starting price':'ಆರಂಭಿಕ ಬೆಲೆ',
  'Accept':'ಸ್ವೀಕರಿಸಿ', 'Decline':'ನಿರಾಕರಿಸಿ',
  'Active Job':'ಸಕ್ರಿಯ ಕೆಲಸ', 'In Progress':'ಪ್ರಗತಿಯಲ್ಲಿದೆ',
  'Awaiting Payment':'ಪಾವತಿಗೆ ಕಾಯಲಾಗುತ್ತಿದೆ', 'Payment Sent':'ಪಾವತಿ ಕಳುಹಿಸಲಾಗಿದೆ',
  'Directions':'ದಾರಿ', 'Call Customer':'ಗ್ರಾಹಕರಿಗೆ ಕರೆ ಮಾಡಿ', 'Call':'ಕರೆ',
  'Work Done — Set Final Price ₹':'ಕೆಲಸ ಮುಗಿಯಿತು — ಅಂತಿಮ ಬೆಲೆ ನಮೂದಿಸಿ ₹',
  'Final Price':'ಅಂತಿಮ ಬೆಲೆ',
  'Send to Customer →':'ಗ್ರಾಹಕರಿಗೆ ಕಳುಹಿಸಿ →',
  'Cancel':'ರದ್ದುಮಾಡಿ',
  'Edit price':'ಬೆಲೆ ಬದಲಿಸಿ',
  'Waiting for them to pay via UPI...':'UPI ಮೂಲಕ ಪಾವತಿಗೆ ಕಾಯಲಾಗುತ್ತಿದೆ...',
  'Check your UPI app, then confirm below':'ನಿಮ್ಮ UPI ಆ್ಯಪ್ ಪರಿಶೀಲಿಸಿ, ನಂತರ ದೃಢೀಕರಿಸಿ',
  '✓ Confirm Payment Received':'✓ ಪಾವತಿ ಬಂದಿದೆ ಎಂದು ದೃಢೀಕರಿಸಿ',
  'Today':'ಇಂದು', 'Jobs done':'ಮುಗಿದ ಕೆಲಸಗಳು', 'Rating':'ರೇಟಿಂಗ್',
  'Upcoming Jobs':'ಮುಂಬರುವ ಕೆಲಸಗಳು',
  'Scheduled Jobs Available':'ನಿಗದಿತ ಕೆಲಸಗಳು ಲಭ್ಯವಿದೆ',
  'Start Job':'ಕೆಲಸ ಪ್ರಾರಂಭಿಸಿ',
  'Home':'ಮುಖಪುಟ', 'Earnings':'ಗಳಿಕೆ', 'Profile':'ಪ್ರೊಫೈಲ್',
  'Before':'ಮೊದಲು', 'After':'ನಂತರ',
}
export function getLang() { return localStorage.getItem('kr_lang') || 'en' }
export function setLang(l) { localStorage.setItem('kr_lang', l) }
export function t(str) { return getLang()==='kn' ? (KN[str] || str) : str }
