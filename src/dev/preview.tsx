import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/index.css';

// Import widgets
import ExpediaFlights from '../components/expedia-flights';
import ExpediaHotels from '../components/expedia-hotels';

// Mock data for preview mode
const mockFlights = {
  flights: [
    {
      id: '1',
      airline: 'Alaska Airlines',
      flightNumber: 'AS 123',
      price: 159,
      departureTime: '8:15 AM',
      arrivalTime: '10:45 AM',
      duration: '2h 30m',
      stops: 0,
      cabinClass: 'Economy',
      imageUrl: 'https://images.trvl-media.com/media/content/expus/graphics/static_content/fusion/v0.1b/images/airlines/vector/s/as_logo_sq.svg',
    },
    {
      id: '2',
      airline: 'United Airlines',
      flightNumber: 'UA 456',
      price: 189,
      departureTime: '11:30 AM',
      arrivalTime: '2:15 PM',
      duration: '2h 45m',
      stops: 0,
      cabinClass: 'Economy',
      imageUrl: 'https://images.trvl-media.com/media/content/expus/graphics/static_content/fusion/v0.1b/images/airlines/vector/s/ua_logo_sq.svg',
    },
    {
      id: '3',
      airline: 'Delta Airlines',
      flightNumber: 'DL 789',
      price: 249,
      departureTime: '3:45 PM',
      arrivalTime: '6:30 PM',
      duration: '2h 45m',
      stops: 1,
      cabinClass: 'Economy',
      imageUrl: 'https://images.trvl-media.com/media/content/expus/graphics/static_content/fusion/v0.1b/images/airlines/vector/s/dl_logo_sq.svg',
    },
    {
      id: '4',
      airline: 'Southwest Airlines',
      flightNumber: 'WN 321',
      price: 139,
      departureTime: '6:00 PM',
      arrivalTime: '8:35 PM',
      duration: '2h 35m',
      stops: 0,
      cabinClass: 'Economy',
      imageUrl: 'https://images.trvl-media.com/media/content/expus/graphics/static_content/fusion/v0.1b/images/airlines/vector/s/wn_logo_sq.svg',
    },
  ],
  origin: 'SEA',
  destination: 'SFO',
  departureDate: 'Dec 15, 2024',
  isRoundTrip: false,
  totalResults: 47,
};

const mockHotels = {
  hotels: [
    {
      id: '1',
      name: 'Hotel Pacifica',
      pricePerNight: 189,
      rating: 8.5,
      neighborhood: 'Downtown San Francisco',
      imageUrl: 'https://images.trvl-media.com/lodging/1000000/30000/27900/27865/3102f1d9.jpg?impolicy=ccrop&w=400&h=400&q=medium',
    },
    {
      id: '2',
      name: 'Grand Hyatt Downtown',
      pricePerNight: 329,
      rating: 9.2,
      neighborhood: 'Financial District',
      imageUrl: 'https://images.trvl-media.com/lodging/2000000/1920000/1916500/1916467/d0b3c3a4.jpg?impolicy=ccrop&w=400&h=400&q=medium',
    },
    {
      id: '3',
      name: 'Bay View Inn',
      pricePerNight: 159,
      rating: 8.0,
      neighborhood: 'Fisherman\'s Wharf',
      imageUrl: 'https://images.trvl-media.com/lodging/3000000/2980000/2979500/2979450/f5e4d6b7.jpg?impolicy=ccrop&w=400&h=400&q=medium',
    },
    {
      id: '4',
      name: 'The Ritz-Carlton',
      pricePerNight: 599,
      rating: 9.5,
      neighborhood: 'Nob Hill',
      imageUrl: 'https://images.trvl-media.com/lodging/4000000/3920000/3916500/3916467/a1b2c3d4.jpg?impolicy=ccrop&w=400&h=400&q=medium',
    },
  ],
  destination: 'San Francisco, CA',
  checkIn: 'Dec 15, 2024',
  checkOut: 'Dec 18, 2024',
  totalResults: 234,
};

function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200 flex flex-col items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-all duration-200"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Expedia Travel Widgets
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Preview with theme toggle
        </p>
      </div>

      <div className="w-[760px] space-y-8">
        <ExpediaFlights {...mockFlights} />
        <ExpediaHotels {...mockHotels} />
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}








