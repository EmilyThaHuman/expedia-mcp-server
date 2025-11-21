import React, { useEffect, useRef, useState } from 'react';
import { useWidgetProps } from '../hooks';
import '../styles/index.css';
import { cn } from '../lib/utils';

interface Hotel {
  id: string;
  name: string;
  pricePerNight: number;
  rating: number;
  neighborhood?: string;
  imageUrl?: string;
}

interface ExpediaHotelsProps {
  hotels?: Hotel[];
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  totalResults?: number;
}

const ExpediaHotels: React.FC = () => {
  const props = useWidgetProps<ExpediaHotelsProps>({
    hotels: [],
    destination: 'Search Results',
    checkIn: '',
    checkOut: '',
    totalResults: 0,
  });

  const {
    hotels = [],
    destination = 'Search Results',
    checkIn = '',
    checkOut = '',
    totalResults = 0,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [showPrevBtn, setShowPrevBtn] = useState(false);
  const [showNextBtn, setShowNextBtn] = useState(true);

  const updateButtons = () => {
    if (!containerRef.current) return;
    
    const scrollLeft = containerRef.current.scrollLeft;
    const maxScroll = containerRef.current.scrollWidth - containerRef.current.clientWidth;
    
    setShowPrevBtn(scrollLeft > 0);
    setShowNextBtn(scrollLeft < maxScroll - 1);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateButtons();
    container.addEventListener('scroll', updateButtons);
    window.addEventListener('resize', updateButtons);

    return () => {
      container.removeEventListener('scroll', updateButtons);
      window.removeEventListener('resize', updateButtons);
    };
  }, [hotels]);

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    
    const scrollAmount = containerRef.current.clientWidth;
    containerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleHotelSelect = (hotel: Hotel) => {
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({
        type: 'hotel-selected',
        data: {
          hotelId: hotel.id,
          hotelName: hotel.name,
          price: hotel.pricePerNight,
          rating: hotel.rating,
        },
      }, '*');
    }
  };

  if (hotels.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center p-10 text-gray-500">
        No hotels found
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden">
      <div className="relative w-full p-4">
        <div
          ref={containerRef}
          className="flex gap-4 overflow-x-auto scroll-smooth p-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {hotels.map((hotel, index) => {
            const badgeClass = hotel.rating >= 9.0 ? 'bg-green-700 text-white' : 'bg-blue-600 text-white';

            return (
              <div
                key={hotel.id}
                className={cn(
                  "flex-shrink-0 w-[270px]",
                  "transition-all duration-300 opacity-100 translate-y-0"
                )}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div
                  onClick={() => handleHotelSelect(hotel)}
                  className={cn(
                    "rounded-3xl overflow-hidden",
                    "transition-all duration-300 cursor-pointer h-auto flex flex-col"
                  )}
                >
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <figure className="relative w-[270px] h-[270px] overflow-hidden bg-gray-100 rounded-3xl mt-3">
                      <img
                        alt={hotel.name}
                        className="w-full h-full object-cover block"
                        src={hotel.imageUrl || 'https://images.trvl-media.com/lodging/1000000/30000/27900/27865/3102f1d9.jpg?impolicy=ccrop&w=1000&h=666&q=medium'}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400/e0e0e0/666666?text=Hotel+Image';
                        }}
                      />
                    </figure>
                  </div>

                  <div className="p-3 flex-1 flex flex-col">
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div className="flex items-start justify-between flex-1">
                          <div className="flex-1">
                            <h3 className="text-base font-semibold leading-snug text-gray-900 mb-1 pr-2 line-clamp-2">
                              {hotel.name}
                            </h3>
                            {hotel.neighborhood && (
                              <div className="text-sm text-gray-600 truncate mb-2">
                                {hotel.neighborhood}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <span className={cn(
                              "inline-flex items-center justify-center min-w-[32px] h-6 px-2",
                              "rounded-md text-[13px] font-bold",
                              badgeClass
                            )}>
                              {hotel.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex flex-col mb-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          <div className="text-xl font-bold text-gray-900">
                            ${hotel.pricePerNight.toLocaleString()} total
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          USD • Includes taxes and fees
                        </div>
                      </div>
                      <button
                        className={cn(
                          "w-full bg-gray-900 text-white border-none rounded-3xl py-2.5 px-4",
                          "text-sm font-semibold cursor-pointer transition-colors duration-200",
                          "hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                        )}
                        style={{ zIndex: 200 }}
                      >
                        Book on Expedia
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Controls */}
        <div className="absolute top-1/2 left-0 right-0 flex justify-between -translate-y-1/2 pointer-events-none z-10">
          <button
            onClick={() => scroll('left')}
            disabled={!showPrevBtn}
            className={cn(
              "pointer-events-auto w-10 h-10 rounded-3xl bg-white border border-gray-300",
              "shadow-md cursor-pointer flex items-center justify-center transition-all duration-200 mx-2",
              "hover:bg-gray-50 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed",
              !showPrevBtn && "opacity-0 pointer-events-none"
            )}
            aria-label="Show previous card"
          >
            <svg className="w-6 h-6 stroke-gray-900" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!showNextBtn}
            className={cn(
              "pointer-events-auto w-10 h-10 rounded-3xl bg-white border border-gray-300",
              "shadow-md cursor-pointer flex items-center justify-center transition-all duration-200 mx-2",
              "hover:bg-gray-50 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed",
              !showNextBtn && "opacity-0 pointer-events-none"
            )}
            aria-label="Show next card"
          >
            <svg className="w-6 h-6 stroke-gray-900" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpediaHotels;








