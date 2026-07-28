# Church Management System - Frontend

This is the React frontend for the Church Management System.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Flask backend running on http://localhost:5555

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The app will open at http://localhost:3000

## Project Structure

```
src/
├── components/          # React components
│   ├── Header.js       # Navigation header
│   ├── Home.js         # Hero/landing section
│   ├── Events.js       # Events listing
│   ├── Ministries.js   # Ministries showcase
│   ├── Sermons.js      # Sermons list
│   ├── Contact.js      # Contact form
│   └── Footer.js       # Footer component
├── context/            # React context
│   └── LanguageContext.js  # i18n language context
├── services/           # API services
│   └── api.js          # Backend API calls
├── styling/            # CSS files
│   ├── header.css
│   ├── home.css
│   ├── events.css
│   ├── ministries.css
│   ├── sermons.css
│   ├── contact.css
│   ├── footer.css
│   └── global.css
├── App.js              # Main app component
└── index.js            # Entry point
```

## Features

- **Bilingual Support**: English and Mongolian languages
- **Responsive Design**: Mobile-first approach
- **API Integration**: Connects to Flask backend
- **Component-based**: Modular and maintainable code
- **Separate Styling**: Individual CSS files for each component

## Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests

## Backend Connection

The app connects to the Flask backend at `http://localhost:5555`. Make sure your Flask server is running before starting the React app.

## YouTube Video Feed

The Sermons page loads the six latest uploads through the Flask backend. Copy
`server/.env.example` to `server/.env`, then set:

```env
YOUTUBE_API_KEY=your_youtube_data_api_key
YOUTUBE_CHANNEL_ID=UCXU8MsZmF7S2H-jfEecfs9w
```

Install backend dependencies with `pipenv install`. The `.env` file is ignored
by Git and the API key is never sent to the React client.

## Customization

To customize the church information:
1. Edit translation strings in `src/context/LanguageContext.js`
2. Update contact details in `src/components/Contact.js`
3. Modify service times in `src/components/Home.js`
4. Change colors and styling in individual CSS files
